import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiShield,
  FiHome,
  FiBriefcase,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiCamera,
  FiCopy,
  FiTrash2,
  FiCheck,
  FiPhone,
  FiMail,
  FiAward,
  FiStar,
  FiUsers,
  FiArrowRight,
  FiUploadCloud,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiTrendingUp,
} from "react-icons/fi";
// Note: EPC Buying Behavior & Analytics moved to Unified Admin Portal EpcProfileDrawer
import { setAlert } from "@/features/alert.slice";
import Button from "@/Components/Button";
import Dialog from "@/Components/Dialog";
import Loader from "@/Components/Loader";
import {
  validateGstStateMatch,
  getGstStateCodesForState,
  getStateNameFromGstCode
} from "@/utils/gstStateCodes";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function EpcProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth_slice);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [allStates, setAllStates] = useState([]);
  const [stateDistricts, setStateDistricts] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Active Tab: 'states' | 'offices'
  const [activeTab, setActiveTab] = useState("states");
  const [selectedStateFilter, setSelectedStateFilter] = useState("all");

  // Modals
  const [showAddStateModal, setShowAddStateModal] = useState(false);
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [copiedGst, setCopiedGst] = useState(null);

  // Add State Form & GST Verification
  const [newStateForm, setNewStateForm] = useState({
    state_id: "",
    gst_number: "",
    legal_name: "",
    trade_name: "",
    phone: "",
    otp: "1234",
  });
  const [isAddingState, setIsAddingState] = useState(false);
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstFetchSuccess, setGstFetchSuccess] = useState(null);
  const [gstFetchError, setGstFetchError] = useState(null);
  const [stateOtpStep, setStateOtpStep] = useState(1); // 1: details, 2: OTP

  // Add Office Form
  const [newOfficeForm, setNewOfficeForm] = useState({
    state_id: "",
    district_id: "",
    office_name: "",
    address: "",
    pincode: "",
    is_home_office: false,
    contact_person: "",
    contact_phone: "",
    photo_file: null,
    photo_preview: null,
  });
  const [isAddingOffice, setIsAddingOffice] = useState(false);

  // Fetch full EPC Profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/india/v1/shop/epc/profile`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        setProfileData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch EPC profile:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load EPC profile",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch all states for dropdown
  const fetchAllStates = async () => {
    try {
      const res = await axios.get(`${API_URL}/india/v1/geo/states`);
      if (res.data?.states) {
        setAllStates(res.data.states);
      }
    } catch (err) {
      console.error("Failed to fetch states:", err);
    }
  };

  // Fetch districts when state changes in Add Office modal
  const fetchDistrictsForState = async (stateId) => {
    if (!stateId) {
      setStateDistricts([]);
      return;
    }
    try {
      setLoadingDistricts(true);
      const res = await axios.get(`${API_URL}/india/v1/geo/districts?state_id=${stateId}`);
      if (res.data?.districts) {
        setStateDistricts(res.data.districts);
      }
    } catch (err) {
      console.error("Failed to fetch districts:", err);
      setStateDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAllStates();
  }, []);

  // Filtered offices by state tab
  const filteredOffices = useMemo(() => {
    if (!profileData?.offices) return [];
    if (selectedStateFilter === "all") return profileData.offices;
    return profileData.offices.filter(
      (o) => o.state_id?.toString() === selectedStateFilter.toString()
    );
  }, [profileData?.offices, selectedStateFilter]);

  // States available for new onboarding (exclude already onboarded)
  const availableStatesForOnboarding = useMemo(() => {
    if (!profileData?.onboarded_states) return allStates;
    const onboardedIds = new Set(
      profileData.onboarded_states.map((s) => s.state_id?.toString())
    );
    return allStates.filter((s) => !onboardedIds.has(s.id?.toString()));
  }, [allStates, profileData?.onboarded_states]);

  // Selected state object for onboarding
  const selectedOnboardState = useMemo(() => {
    return allStates.find((s) => s.id?.toString() === newStateForm.state_id?.toString()) || null;
  }, [allStates, newStateForm.state_id]);

  // Real-time GST State Code cross-check validation (First 2 digits of GSTIN vs State)
  const gstStateValidation = useMemo(() => {
    if (!selectedOnboardState || !newStateForm.gst_number) return null;
    const cleanGst = newStateForm.gst_number.trim().toUpperCase();
    if (cleanGst.length < 2) return null;
    return validateGstStateMatch(selectedOnboardState.name, cleanGst);
  }, [selectedOnboardState, newStateForm.gst_number]);

  // Handle Verify & Auto-fetch GST Details from Backend API
  const handleLookupGst = async () => {
    if (!newStateForm.state_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a state first." }));
      return;
    }
    const cleanGst = newStateForm.gst_number.trim().toUpperCase();
    if (cleanGst.length !== 15) {
      dispatch(setAlert({ type: "warning", message: "GSTIN must be exactly 15 characters." }));
      return;
    }
    if (gstStateValidation && !gstStateValidation.isValid) {
      dispatch(setAlert({ type: "error", message: gstStateValidation.message }));
      return;
    }

    try {
      setIsFetchingGst(true);
      setGstFetchError(null);
      const res = await axios.post(
        `${API_URL}/india/v1/shop/epc/gst/lookup`,
        { gst_number: cleanGst, state_id: newStateForm.state_id },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.verified) {
        setGstFetchSuccess(res.data);
        setNewStateForm((prev) => ({
          ...prev,
          legal_name: res.data.legal_name || prev.legal_name,
          trade_name: res.data.trade_name || prev.trade_name || res.data.legal_name,
        }));
        dispatch(
          setAlert({
            type: "success",
            message: `GST verified! Company details auto-fetched: ${res.data.legal_name}`,
          })
        );
      }
    } catch (err) {
      console.error("GST lookup error:", err);
      const msg = err.response?.data?.message || "Failed to fetch GST details from tax portal.";
      setGstFetchError(msg);
      setGstFetchSuccess(null);
      dispatch(setAlert({ type: "error", message: msg }));
    } finally {
      setIsFetchingGst(false);
    }
  };

  // Copy GST helper
  const handleCopyGst = (gst) => {
    navigator.clipboard.writeText(gst);
    setCopiedGst(gst);
    setTimeout(() => setCopiedGst(null), 2000);
  };

  // Handle Photo File selection for Office
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setNewOfficeForm((prev) => ({
        ...prev,
        photo_file: file,
        photo_preview: previewUrl,
      }));
    }
  };

  // Handle Submit Onboard New State
  const handleOnboardState = async (e) => {
    e.preventDefault();
    if (!newStateForm.state_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a state" }));
      return;
    }
    const cleanGst = newStateForm.gst_number.trim().toUpperCase();
    if (cleanGst.length !== 15) {
      dispatch(
        setAlert({
          type: "warning",
          message: "GSTIN must be exactly 15 characters",
        })
      );
      return;
    }

    // ── REQUIREMENT 1: Cross-check first 2 digits of GST against selected State ──
    if (gstStateValidation && !gstStateValidation.isValid) {
      dispatch(
        setAlert({
          type: "error",
          message: gstStateValidation.message,
        })
      );
      return;
    }

    try {
      setIsAddingState(true);
      const res = await axios.post(
        `${API_URL}/india/v1/shop/epc/onboard-state`,
        {
          state_id: newStateForm.state_id,
          gst_number: cleanGst,
          legal_name: newStateForm.legal_name || profileData?.company?.legal_name,
          trade_name: newStateForm.trade_name || profileData?.company?.name,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: res.data.message || "State onboarded successfully!",
          })
        );
        setShowAddStateModal(false);
        setNewStateForm({
          state_id: "",
          gst_number: "",
          legal_name: "",
          trade_name: "",
          phone: "",
          otp: "1234",
        });
        setGstFetchSuccess(null);
        setGstFetchError(null);
        setStateOtpStep(1);
        fetchProfile();
      }
    } catch (err) {
      console.error("Onboard state error:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message || "Failed to onboard in state.",
        })
      );
    } finally {
      setIsAddingState(false);
    }
  };

  // Handle Submit Add Office
  const handleAddOffice = async (e) => {
    e.preventDefault();
    if (
      !newOfficeForm.state_id ||
      !newOfficeForm.district_id ||
      !newOfficeForm.address ||
      !newOfficeForm.pincode
    ) {
      dispatch(
        setAlert({
          type: "warning",
          message: "Please fill in all required office details.",
        })
      );
      return;
    }

    try {
      setIsAddingOffice(true);
      const formData = new FormData();
      formData.append("state_id", newOfficeForm.state_id);
      formData.append("district_id", newOfficeForm.district_id);
      formData.append(
        "office_name",
        newOfficeForm.office_name || "Regional Office"
      );
      formData.append("address", newOfficeForm.address);
      formData.append("pincode", newOfficeForm.pincode);
      formData.append("is_home_office", newOfficeForm.is_home_office);
      formData.append("contact_person", newOfficeForm.contact_person || "");
      formData.append("contact_phone", newOfficeForm.contact_phone || "");

      if (newOfficeForm.photo_file) {
        formData.append("file", newOfficeForm.photo_file);
      }

      const res = await axios.post(
        `${API_URL}/india/v1/shop/epc/offices`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: res.data.message || "Office added successfully!",
          })
        );
        setShowAddOfficeModal(false);
        setNewOfficeForm({
          state_id: "",
          district_id: "",
          office_name: "",
          address: "",
          pincode: "",
          is_home_office: false,
          contact_person: "",
          contact_phone: "",
          photo_file: null,
          photo_preview: null,
        });
        fetchProfile();
      }
    } catch (err) {
      console.error("Add office error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to add office.",
        })
      );
    } finally {
      setIsAddingOffice(false);
    }
  };

  // Set as Home Office directly
  const handleSetHomeOffice = async (officeId, officeName) => {
    try {
      const res = await axios.patch(
        `${API_URL}/india/v1/shop/epc/offices/${officeId}/set-home`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: `${officeName} is now tagged as the State Home Office!`,
          })
        );
        fetchProfile();
      }
    } catch (err) {
      console.error("Set home office error:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message || "Failed to set Home Office.",
        })
      );
    }
  };

  // Delete office
  const handleDeleteOffice = async (officeId, officeName) => {
    if (!window.confirm(`Are you sure you want to delete ${officeName}?`)) {
      return;
    }
    try {
      const res = await axios.delete(
        `${API_URL}/india/v1/shop/epc/offices/${officeId}`,
        { withCredentials: true }
      );
      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: "Office removed successfully",
          })
        );
        fetchProfile();
      }
    } catch (err) {
      console.error("Delete office error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to delete office.",
        })
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader text="Loading EPC Profile & Operations..." />
      </div>
    );
  }

  const company = profileData?.company || {};
  const account = profileData?.account || {};
  const stats = profileData?.stats || {
    total_states: 0,
    total_offices: 0,
    total_home_offices: 0,
    total_team_users: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* ── TOP HERO BANNER: EPC Identity & Stats (Solar Store Theme) ────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-[#1e2f70] to-[#152250] text-white border border-primary-400/20 shadow-xl shadow-primary/15 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-accent to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-xl ring-4 ring-white/15 shrink-0">
              {account.name ? account.name.substring(0, 2).toUpperCase() : "EP"}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {account.name || "Solar EPC Partner"}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm">
                  <FiCheckCircle size={13} /> Certified Solar EPC
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                  Role: {account.role ? account.role.toUpperCase() : "OWNER"}
                </span>
                {account.epc_type && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-300/30 backdrop-blur-sm" title="Admin-Verified EPC Classification Type">
                    <FiAward size={13} className="text-amber-300" />
                    <span>{account.epc_type}</span>
                  </span>
                )}
              </div>
              <p className="text-white/80 font-medium text-xs sm:text-sm mt-1.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <FiBriefcase className="text-amber-300" />
                  {company.name || "Solar EPC Enterprise"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FiMail className="text-sky-300" />
                  {account.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FiPhone className="text-emerald-300" />
                  +91 {account.whatsapp || "N/A"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setStateOtpStep(1);
                setShowAddStateModal(true);
              }}
              className="bg-gradient-to-r from-accent to-amber-500 hover:from-amber-500 hover:to-accent text-white font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-200 border-0 flex-1 lg:flex-none flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <FiPlus size={18} />
              <span>Onboard In New State</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (profileData?.onboarded_states?.length > 0) {
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    state_id: profileData.onboarded_states[0].state_id,
                  }));
                  fetchDistrictsForState(profileData.onboarded_states[0].state_id);
                }
                setShowAddOfficeModal(true);
              }}
              className="border border-white/30 text-white hover:bg-white/15 backdrop-blur-sm font-bold px-5 py-3 rounded-xl hover:-translate-y-0.5 transition-all duration-200 flex-1 lg:flex-none flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <FiHome size={18} />
              <span>Add District Office</span>
            </button>
          </div>
        </div>

        {/* ── Metric Badges (Frosted Glass Solar Store Style) ─────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/15">
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Onboarded States
              </span>
              <FiMapPin className="text-amber-300 text-lg" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.total_states}
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              GST verified jurisdictions
            </p>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Total Offices
              </span>
              <FiBriefcase className="text-sky-300 text-lg" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.total_offices}
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              Across active districts
            </p>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Home Offices
              </span>
              <FiStar className="text-amber-300 text-lg" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.total_home_offices}
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              State HQ base locations
            </p>
          </div>

          <div
            onClick={() => navigate("/users/create")}
            className="bg-white/10 hover:bg-white/20 hover:border-white/30 cursor-pointer backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white group"
            title="Manage EPC Team & Sub-Users"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
                Sub-User Logins
              </span>
              <FiUsers className="text-emerald-300 text-lg" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.total_team_users}
            </div>
            <p className="text-[11px] text-white/70 mt-0.5 flex items-center justify-between">
              <span>Assigned staff</span>
              <span className="text-emerald-300 font-bold group-hover:underline">Manage Team →</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── TAB SELECTOR (Solar Store Pill Container) ────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-surface border border-border rounded-2xl shadow-xs w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("states")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${activeTab === "states"
            ? "bg-gradient-to-r from-primary to-primary-end text-white shadow-md shadow-primary/25"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            }`}
        >
          <FiShield size={16} />
          <span>1. Multi-State GST Onboarding</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "states"
              ? "bg-white/20 text-white"
              : "bg-surface-hover text-text-muted border border-border"
              }`}
          >
            {profileData?.onboarded_states?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("offices")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${activeTab === "offices"
            ? "bg-gradient-to-r from-primary to-primary-end text-white shadow-md shadow-primary/25"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            }`}
        >
          <FiHome size={16} />
          <span>2. Multi-District Offices & Home Office Tagging</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "offices"
              ? "bg-white/20 text-white"
              : "bg-surface-hover text-text-muted border border-border"
              }`}
          >
            {profileData?.offices?.length || 0}
          </span>
        </button>


      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MULTI-STATE ONBOARDING WITH GST                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "states" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-xs">
            <div>
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <FiShield className="text-primary" /> Onboarded States & GST Registrations
              </h2>
              <p className="text-text-secondary text-xs mt-0.5">
                Every state requires verified GST credentials. As you expand,
                onboard additional states with their respective GSTIN.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStateOtpStep(1);
                setShowAddStateModal(true);
              }}
              className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm shadow-primary/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FiPlus size={15} />
              <span>Onboard Another State</span>
            </button>
          </div>

          {/* Onboarded States Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profileData?.onboarded_states?.map((st) => {
              const stateOffices = (profileData?.offices || []).filter(
                (o) => o.state_id?.toString() === st.state_id?.toString()
              );
              const homeOffice = stateOffices.find((o) => o.is_home_office);

              return (
                <div
                  key={st.id || st.state_id}
                  className="bg-surface rounded-2xl border border-border hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5">
                    {/* State Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                          {st.state_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-text-primary leading-tight">
                            {st.state_name}
                          </h3>
                          <span className="text-[11px] text-text-muted">
                            State ID: {st.state_id.slice(-6)}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                        <FiCheck size={12} /> Active
                      </span>
                    </div>

                    {/* GSTIN Box */}
                    <div className="bg-surface-hover rounded-xl p-3 border border-border/80 my-3">
                      <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          State GSTIN
                        </span>
                        <button
                          onClick={() => handleCopyGst(st.gst_number)}
                          className="hover:text-primary transition-colors flex items-center gap-1 text-[11px] font-semibold"
                          title="Copy GSTIN"
                        >
                          {copiedGst === st.gst_number ? (
                            <span className="text-success flex items-center gap-0.5">
                              <FiCheck size={12} /> Copied
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <FiCopy size={12} /> Copy
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="font-mono font-black text-text-primary text-sm tracking-wider">
                        {st.gst_number}
                      </div>
                    </div>

                    {/* Office Presence Info */}
                    <div className="space-y-1.5 text-xs text-text-secondary pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">District Offices:</span>
                        <span className="font-bold text-text-primary">
                          {stateOffices.length} Locations
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Home Office HQ:</span>
                        <span
                          className={`font-bold ${homeOffice ? "text-accent" : "text-text-muted italic"
                            }`}
                        >
                          {homeOffice ? homeOffice.district_name : "Not Tagged Yet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3 bg-surface-hover/60 border-t border-border flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setSelectedStateFilter(st.state_id);
                        setActiveTab("offices");
                      }}
                      className="text-primary hover:text-primary-hover font-bold flex items-center gap-1 group"
                    >
                      View District Offices{" "}
                      <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <button
                      onClick={() => {
                        setNewOfficeForm((prev) => ({
                          ...prev,
                          state_id: st.state_id,
                        }));
                        fetchDistrictsForState(st.state_id);
                        setShowAddOfficeModal(true);
                      }}
                      className="text-text-secondary hover:text-accent font-bold"
                    >
                      + Add District
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: MULTI-DISTRICT OFFICES & HOME OFFICE TAGGING                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "offices" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-xs">
            <div>
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <FiHome className="text-primary" /> District Offices & Home Office Tagging
              </h2>
              <p className="text-text-secondary text-xs mt-0.5">
                Manage all your operational centers across districts. Tag
                exactly one <strong className="text-text-primary">Home Office (HQ)</strong> per state, with
                all other offices functioning as working branch offices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (
                  selectedStateFilter !== "all" &&
                  selectedStateFilter
                ) {
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    state_id: selectedStateFilter,
                  }));
                  fetchDistrictsForState(selectedStateFilter);
                } else if (profileData?.onboarded_states?.length > 0) {
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    state_id: profileData.onboarded_states[0].state_id,
                  }));
                  fetchDistrictsForState(profileData.onboarded_states[0].state_id);
                }
                setShowAddOfficeModal(true);
              }}
              className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm shadow-primary/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FiPlus size={15} />
              <span>Add New District Office</span>
            </button>
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedStateFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${selectedStateFilter === "all"
                ? "bg-gradient-to-r from-primary to-primary-end text-white shadow-sm shadow-primary/25"
                : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
            >
              All States ({profileData?.offices?.length || 0})
            </button>
            {profileData?.onboarded_states?.map((st) => {
              const count = (profileData?.offices || []).filter(
                (o) => o.state_id?.toString() === st.state_id?.toString()
              ).length;
              return (
                <button
                  key={st.state_id}
                  onClick={() => setSelectedStateFilter(st.state_id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${selectedStateFilter === st.state_id
                    ? "bg-gradient-to-r from-primary to-primary-end text-white shadow-sm shadow-primary/25"
                    : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                >
                  <span>{st.state_name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedStateFilter === st.state_id
                      ? "bg-white/20 text-white"
                      : "bg-surface-hover text-text-muted border border-border/80"
                      }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Offices List / Grid */}
          {filteredOffices.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <FiHome size={28} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                No District Offices Added Yet
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto mt-1 mb-5">
                Add an office in any of your onboarded states to activate that
                district for procurement, delivery, and team member assignment.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (profileData?.onboarded_states?.length > 0) {
                    setNewOfficeForm((prev) => ({
                      ...prev,
                      state_id: profileData.onboarded_states[0].state_id,
                    }));
                    fetchDistrictsForState(profileData.onboarded_states[0].state_id);
                  }
                  setShowAddOfficeModal(true);
                }}
                className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-primary/20 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <FiPlus size={15} />
                <span>Add Your First Office</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOffices.map((office) => {
                return (
                  <div
                    key={office.id || office._id}
                    className={`bg-surface rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${office.is_home_office
                      ? "border-amber-400/80 ring-2 ring-amber-400/20"
                      : "border-border hover:border-primary/40"
                      }`}
                  >
                    <div>
                      {/* Office Image Banner */}
                      <div className="relative h-40 bg-slate-900 overflow-hidden flex items-center justify-center text-slate-500">
                        {office.photo_url ? (
                          <img
                            src={
                              office.photo_url.startsWith("http")
                                ? office.photo_url
                                : `${API_URL.replace("/api", "")}${office.photo_url}`
                            }
                            alt={office.office_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <FiCamera size={26} className="text-slate-600" />
                            <span className="text-[11px] text-slate-400 font-medium">
                              Office Photo Proof
                            </span>
                          </div>
                        )}

                        {/* Top Badge: Home Office vs Branch Office */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          {office.is_home_office ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md">
                              <FiStar size={13} className="fill-current" /> STATE HOME
                              OFFICE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 backdrop-blur-sm text-sky-300 border border-sky-400/30">
                              <FiBriefcase size={13} /> Working Branch
                            </span>
                          )}
                        </div>

                        {/* District Badge */}
                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-black text-white border border-white/10">
                          📍 {office.district_name}, {office.state_name}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="font-black text-base text-text-primary leading-snug">
                            {office.office_name}
                          </h3>
                          <p className="text-xs text-text-secondary mt-1 flex items-start gap-1.5 leading-relaxed">
                            <FiMapPin className="text-primary shrink-0 mt-0.5" />
                            <span>
                              {office.address}, PIN: {office.pincode}
                            </span>
                          </p>
                        </div>

                        {/* Contact details */}
                        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <FiPhone className="text-emerald-500" />
                            {office.contact_phone || account.whatsapp || "N/A"}
                          </span>
                          <span className="font-semibold text-text-muted">
                            {office.contact_person || account.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="px-5 py-3 bg-surface-hover/70 border-t border-border flex items-center justify-between text-xs gap-2">
                      {!office.is_home_office ? (
                        <button
                          onClick={() =>
                            handleSetHomeOffice(
                              office.id || office._id,
                              office.office_name
                            )
                          }
                          className="font-bold text-accent hover:text-amber-600 flex items-center gap-1"
                        >
                          <FiStar size={13} /> Tag As Home Office
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <FiCheckCircle size={13} /> Primary State HQ
                        </span>
                      )}

                      <button
                        onClick={() =>
                          handleDeleteOffice(
                            office.id || office._id,
                            office.office_name
                          )
                        }
                        className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                        title="Delete Office"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}



      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ONBOARD NEW STATE WITH GST                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={showAddStateModal}
        onClose={() => setShowAddStateModal(false)}
        title="Onboard In New State (Multi-State Expansion)"
        size="md"
      >
        <form onSubmit={handleOnboardState} className="space-y-4 py-2">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 text-xs text-primary leading-relaxed flex items-start gap-2.5">
            <FiShield size={18} className="shrink-0 mt-0.5 text-primary" />
            <div>
              <p className="font-bold">GST-Based State Activation</p>
              <p className="text-text-secondary mt-0.5">
                Enter your GSTIN number registered in the target state. Once
                verified, you can configure district offices and start placing
                orders in this state.
              </p>
            </div>
          </div>

          {/* Select State */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider">
                Select State to Onboard <span className="text-danger">*</span>
              </label>
              {selectedOnboardState && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Expected GST Code: {getGstStateCodesForState(selectedOnboardState.name).join(" or ")}
                </span>
              )}
            </div>
            <select
              value={newStateForm.state_id}
              onChange={(e) => {
                setNewStateForm((prev) => ({
                  ...prev,
                  state_id: e.target.value,
                }));
                setGstFetchSuccess(null);
                setGstFetchError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">-- Choose State --</option>
              {availableStatesForOnboarding.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* GSTIN Field with State-Code Cross-Check & Verification Action */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider">
                GSTIN Number For This State <span className="text-danger">*</span>
              </label>
              {newStateForm.gst_number.trim().length === 15 && (
                <button
                  type="button"
                  onClick={handleLookupGst}
                  disabled={isFetchingGst || (gstStateValidation && !gstStateValidation.isValid)}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
                >
                  <FiRefreshCw size={12} className={isFetchingGst ? "animate-spin" : ""} />
                  {isFetchingGst ? "Fetching Details..." : "Auto-Fetch Company Info"}
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={newStateForm.gst_number}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().trim();
                  setNewStateForm((prev) => ({
                    ...prev,
                    gst_number: val,
                  }));
                  setGstFetchError(null);
                  if (val.length < 15) setGstFetchSuccess(null);
                }}
                placeholder="e.g. 24AAAFB1234A1Z5"
                maxLength={15}
                required
                className={`w-full px-3.5 py-2.5 bg-surface border rounded-xl font-mono text-sm font-bold uppercase tracking-wider text-text-primary focus:outline-none transition-colors ${gstStateValidation
                  ? gstStateValidation.isValid
                    ? "border-success/60 focus:border-success"
                    : "border-danger focus:border-danger bg-danger/5"
                  : "border-border focus:border-primary"
                  }`}
              />
              {gstStateValidation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {gstStateValidation.isValid ? (
                    <FiCheckCircle size={18} className="text-success" />
                  ) : (
                    <FiAlertCircle size={18} className="text-danger" />
                  )}
                </div>
              )}
            </div>

            {/* Real-time State Code Match / Mismatch Feedback Banner */}
            {gstStateValidation && (
              <div
                className={`mt-1.5 text-xs p-2 rounded-lg flex items-start gap-1.5 ${gstStateValidation.isValid
                  ? "bg-success/10 text-success border border-success/20 font-bold"
                  : "bg-danger/10 text-danger border border-danger/20 font-bold"
                  }`}
              >
                {gstStateValidation.isValid ? (
                  <FiCheckCircle size={14} className="shrink-0 mt-0.5" />
                ) : (
                  <FiAlertCircle size={14} className="shrink-0 mt-0.5" />
                )}
                <span>{gstStateValidation.message}</span>
              </div>
            )}

            {!gstStateValidation && (
              <p className="text-[10px] text-text-muted mt-1">
                15-character Goods & Services Tax Identification Number (First 2 digits represent state code)
              </p>
            )}
          </div>

          {/* Quick Auto-fetch button prompt if user entered 15 chars and not fetched yet */}
          {newStateForm.gst_number.trim().length === 15 &&
            gstStateValidation?.isValid &&
            !gstFetchSuccess && (
              <button
                type="button"
                onClick={handleLookupGst}
                disabled={isFetchingGst}
                className="w-full py-2 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors"
              >
                <FiRefreshCw size={14} className={isFetchingGst ? "animate-spin" : ""} />
                {isFetchingGst
                  ? "Verifying GST & Fetching Company Details..."
                  : "Click to Auto-Fetch Legal & Brand Name via GST API"}
              </button>
            )}

          {/* Verified GST Preview Box (Auto-fetched Information) */}
          {gstFetchSuccess && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-success flex items-center gap-1.5">
                  <FiCheckCircle size={14} /> Verified GSTIN Data Auto-Fetched
                </span>
                <span className="bg-success text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                  {gstFetchSuccess.status || "Active"}
                </span>
              </div>
              <p className="text-text-primary font-bold text-sm">
                {gstFetchSuccess.legal_name}
              </p>
              {gstFetchSuccess.trade_name && (
                <p className="text-text-secondary text-xs">
                  Trade Name: <span className="font-bold text-text-primary">{gstFetchSuccess.trade_name}</span>
                </p>
              )}
              {gstFetchSuccess.address && (
                <p className="text-text-muted text-[11px] leading-relaxed">
                  Address: {gstFetchSuccess.address}
                </p>
              )}
            </div>
          )}

          {gstFetchError && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-2.5 text-xs text-danger font-medium flex items-center gap-2">
              <FiAlertCircle size={14} className="shrink-0" />
              <span>{gstFetchError}</span>
            </div>
          )}

          {/* Business / Legal Name (Auto-filled by GST API) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={newStateForm.legal_name}
                onChange={(e) =>
                  setNewStateForm((prev) => ({
                    ...prev,
                    legal_name: e.target.value,
                  }))
                }
                placeholder={company.legal_name || "Auto-fetched Legal Name"}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Trade / Brand Name
              </label>
              <input
                type="text"
                value={newStateForm.trade_name}
                onChange={(e) =>
                  setNewStateForm((prev) => ({
                    ...prev,
                    trade_name: e.target.value,
                  }))
                }
                placeholder={company.name || "Auto-fetched Trade Name"}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddStateModal(false);
                setGstFetchSuccess(null);
                setGstFetchError(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAddingState || (gstStateValidation && !gstStateValidation.isValid)}
              className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAddingState ? "Verifying & Onboarding..." : "Verify & Onboard State"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD DISTRICT OFFICE + HOME OFFICE TAGGING                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={showAddOfficeModal}
        onClose={() => setShowAddOfficeModal(false)}
        title="Add District Office & Tag Home Office"
        size="lg"
      >
        <form onSubmit={handleAddOffice} className="space-y-4 py-2">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
            <FiStar size={18} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-bold">Home Office vs Branch Office</p>
              <p className="text-text-secondary mt-0.5">
                An EPC can operate across multiple districts in each state. You
                must tag <strong>one Home Office (main HQ)</strong> per state,
                while any other offices will act as branch offices.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* State Selection */}
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                State (Onboarded Only) <span className="text-danger">*</span>
              </label>
              <select
                value={newOfficeForm.state_id}
                onChange={(e) => {
                  const sId = e.target.value;
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    state_id: sId,
                    district_id: "",
                  }));
                  fetchDistrictsForState(sId);
                }}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">-- Select Onboarded State --</option>
                {profileData?.onboarded_states?.map((st) => (
                  <option key={st.state_id} value={st.state_id}>
                    {st.state_name}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                District <span className="text-danger">*</span>
              </label>
              <select
                value={newOfficeForm.district_id}
                onChange={(e) =>
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    district_id: e.target.value,
                  }))
                }
                disabled={!newOfficeForm.state_id || loadingDistricts}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">
                  {loadingDistricts
                    ? "Loading Districts..."
                    : "-- Choose District --"}
                </option>
                {stateDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Office Name */}
          <div>
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
              Office Name / Title
            </label>
            <input
              type="text"
              value={newOfficeForm.office_name}
              onChange={(e) =>
                setNewOfficeForm((prev) => ({
                  ...prev,
                  office_name: e.target.value,
                }))
              }
              placeholder="e.g. Surat Main Central Office"
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Address & Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Complete Office Address <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={newOfficeForm.address}
                onChange={(e) =>
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="Building, street, landmark, area"
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Pincode <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={newOfficeForm.pincode}
                onChange={(e) =>
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="6-digit PIN"
                maxLength={6}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-mono text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Contact Person Name
              </label>
              <input
                type="text"
                value={newOfficeForm.contact_person}
                onChange={(e) =>
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    contact_person: e.target.value,
                  }))
                }
                placeholder={account.name || "Contact Person"}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Office Contact Number
              </label>
              <input
                type="tel"
                value={newOfficeForm.contact_phone}
                onChange={(e) =>
                  setNewOfficeForm((prev) => ({
                    ...prev,
                    contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                placeholder="10-digit mobile"
                maxLength={10}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Office Photo Upload Proof */}
          <div>
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
              Office Photo Proof (Signage / Exterior / Premises)
            </label>
            <div className="border-2 border-dashed border-border rounded-2xl p-4 text-center hover:border-primary/50 transition-colors">
              {newOfficeForm.photo_preview ? (
                <div className="relative inline-block">
                  <img
                    src={newOfficeForm.photo_preview}
                    alt="Preview"
                    className="w-48 h-28 object-cover rounded-xl shadow-md border border-border"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewOfficeForm((prev) => ({
                        ...prev,
                        photo_file: null,
                        photo_preview: null,
                      }))
                    }
                    className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1 shadow"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <FiUploadCloud size={28} className="text-primary mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-text-primary block">
                    Upload Office Photo Proof
                  </span>
                  <span className="text-[10px] text-text-muted">
                    JPG, PNG, WebP up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* HOME OFFICE TAGGING CHECKBOX */}
          <div className="bg-surface-hover border border-border rounded-2xl p-4 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="is_home_office_check"
              checked={newOfficeForm.is_home_office}
              onChange={(e) =>
                setNewOfficeForm((prev) => ({
                  ...prev,
                  is_home_office: e.target.checked,
                }))
              }
              className="w-5 h-5 rounded text-accent focus:ring-accent mt-0.5"
            />
            <label
              htmlFor="is_home_office_check"
              className="cursor-pointer text-xs"
            >
              <span className="font-black text-text-primary block text-sm flex items-center gap-1.5">
                <FiStar className="text-amber-500 fill-amber-500" /> Tag as
                State Home Office (Primary Headquarters)
              </span>
              <span className="text-text-secondary text-xs block mt-0.5">
                Check this if this office serves as your primary main headquarters
                in {profileData?.onboarded_states?.find((s) => s.state_id === newOfficeForm.state_id)?.state_name || "this state"}. Exactly one Home Office is allowed per state.
              </span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddOfficeModal(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAddingOffice}
              className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAddingOffice ? "Saving Office..." : "Add District Office"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
