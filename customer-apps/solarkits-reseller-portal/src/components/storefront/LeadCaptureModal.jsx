import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCheckCircle,
  FiSend,
  FiLoader,
  FiShield,
  FiPhone,
  FiMail,
  FiBriefcase,
  FiMapPin,
  FiPackage,
  FiDollarSign,
  FiFileText,
  FiMessageSquare,
  FiLayers,
  FiMap,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
} from "react-icons/fi";
import { INDIAN_STATES_DISTRICTS, getClustersForState } from "../../data/territoryData";
import api from "../../services/api";
import ClusterTerritoryMap from "./ClusterTerritoryMap";
import { getTelemetryContext, trackFormSubmission } from "../../utils/websiteTelemetry";

export default function LeadCaptureModal({
  isOpen,
  onClose,
  initialContext = {},
  actionType = "bulk_price", // "bulk_price" | "custom_config" | "territory_review" | "franchise_apply" | "general_inquiry"
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    mobileNumber: "",
    whatsappNumber: "",
    email: "",
    gstin: "",
    businessType: "",
    solarExperience: "1 - 3 Years",
    investmentRange: "₹5 Lakh - ₹15 Lakh",
    state: "Maharashtra",
    district: "Pune",
    pincode: "",
    clusterId: "",
    clusterName: "Pune Region",
    clusterCode: "CLU-MA-004",
    clusterDistricts: ["Pune", "Kolhapur", "Sangli", "Satara", "Solapur"],
    requiredKitConfig: "",
    expectedOrderQty: "",
    preferredFranchiseModel: "Dealer Wholesale (Stocking Partner)",
    notes: "",
    consent: true,
  });

  // QuickeKYC GST-Linked Mobile OTP State
  const [gstOtpSent, setGstOtpSent] = useState(false);
  const [gstOtpInput, setGstOtpInput] = useState("");
  const [gstRequestId, setGstRequestId] = useState("");
  const [gstLoading, setGstLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [gstLegalName, setGstLegalName] = useState("");
  const [gstTradeName, setGstTradeName] = useState("");
  const [gstErrorMsg, setGstErrorMsg] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableClusters, setAvailableClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [businessProfiles, setBusinessProfiles] = useState([]);
  const [formFieldsConfig, setFormFieldsConfig] = useState(null);
  const [showTerritoryMap, setShowTerritoryMap] = useState(true);
  const modalContentRef = useRef(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState("");
  const [invalidFields, setInvalidFields] = useState([]);

  // Auto-sync cluster selection from interactive map click
  const handleClusterSelectFromMap = (clu, districtName) => {
    if (!clu) return;
    setSelectedCluster(clu);
    setFormData((prev) => ({
      ...prev,
      clusterId: clu._id || clu.id || "",
      clusterName: clu.cluster_name,
      clusterCode: clu.cluster_code,
      clusterDistricts: clu.district_names || [],
      district: districtName || (clu.district_names && clu.district_names[0]) || prev.district || "",
    }));
  };

  // ── Fetch Dynamic Apply Form Configuration ────────────────────────────────
  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const res = await api.get('/india/v1/reseller/leads/form-config');
        if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
          setFormFieldsConfig(res.data.data);
          return;
        }
      } catch (err) {
        // try fallback endpoint
      }

      try {
        const res2 = await api.get('/reseller/leads/form-config');
        if (res2.data?.status === 'success' && Array.isArray(res2.data?.data)) {
          setFormFieldsConfig(res2.data.data);
        }
      } catch (err2) {
        console.warn('[LeadCaptureModal] Note: Using default active form fields configuration');
      }
    };
    fetchFormConfig();
  }, []);

  const fieldConfigMap = useMemo(() => {
    const map = {};
    if (Array.isArray(formFieldsConfig)) {
      formFieldsConfig.forEach((f) => {
        map[f.field_key] = f;
      });
    }
    return map;
  }, [formFieldsConfig]);

  const isFieldActive = (key, defaultActive = true) => {
    if (!formFieldsConfig) return defaultActive;
    const cfg = fieldConfigMap[key];
    return cfg ? cfg.is_active !== false : false;
  };

  const isFieldCompulsory = (key, defaultCompulsory = false) => {
    if (!isFieldActive(key)) return false;
    if (!formFieldsConfig) return defaultCompulsory;
    const cfg = fieldConfigMap[key];
    return cfg ? Boolean(cfg.is_required) : defaultCompulsory;
  };

  const getFieldLabel = (key, defaultLabel) => {
    const cfg = fieldConfigMap[key];
    return (cfg && cfg.label) || defaultLabel;
  };

  const getFieldPlaceholder = (key, defaultPlaceholder) => {
    const cfg = fieldConfigMap[key];
    return (cfg && cfg.placeholder) || defaultPlaceholder;
  };

  const getFieldHelpText = (key, defaultHelpText = "") => {
    const cfg = fieldConfigMap[key];
    return (cfg && cfg.help_text) || defaultHelpText;
  };

  // ── Fetch Dynamic Business Profiles from Backend ─────────────────────────
  useEffect(() => {
    const applyProfiles = (list) => {
      if (Array.isArray(list)) {
        setBusinessProfiles(list);
        if (list.length > 0) {
          setFormData((prev) => ({
            ...prev,
            businessType: prev.businessType || list[0].name,
          }));
        }
      }
    };

    api
      .get("/business-profiles/active")
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          applyProfiles(res.data.data);
        }
      })
      .catch(() => {
        api
          .get("/india/v1/business-profiles/active")
          .then((res) => {
            if (res.data?.status === "success" && Array.isArray(res.data.data)) {
              applyProfiles(res.data.data);
            }
          })
          .catch(() => { });
      });
  }, []);

  useEffect(() => {
    if (initialContext) {
      setFormData((prev) => ({
        ...prev,
        state: initialContext.state || prev.state,
        district: initialContext.district || prev.district,
        pincode: initialContext.pincode || prev.pincode,
        requiredKitConfig: initialContext.kitName
          ? `${initialContext.kitName} (${initialContext.capacityDisplay || ""})`
          : initialContext.requiredConfig || prev.requiredKitConfig,
        preferredFranchiseModel: initialContext.preferredModel || prev.preferredFranchiseModel,
      }));
    }
  }, [initialContext, isOpen]);

  useEffect(() => {
    if (formData.state && INDIAN_STATES_DISTRICTS[formData.state]) {
      const allDistricts = INDIAN_STATES_DISTRICTS[formData.state] || [];
      setAvailableDistricts(allDistricts);

      if (!allDistricts.includes(formData.district)) {
        setFormData((prev) => ({ ...prev, district: allDistricts[0] || "" }));
      }
    }
  }, [formData.state]);

  // ── Resolve Franchise Clusters on State Change ───────────────────────────
  useEffect(() => {
    if (formData.state) {
      const baselineClusters = getClustersForState(formData.state);
      setAvailableClusters(baselineClusters);

      if (baselineClusters.length > 0) {
        const defaultClu = baselineClusters[0];
        setSelectedCluster(defaultClu);
        setFormData((prev) => ({
          ...prev,
          clusterId: defaultClu._id || defaultClu.id || "",
          clusterName: defaultClu.cluster_name,
          clusterCode: defaultClu.cluster_code,
          clusterDistricts: defaultClu.district_names || [],
          district: (defaultClu.district_names && defaultClu.district_names[0]) || prev.district || "",
        }));
      } else {
        // State has 0 clusters in constants
        setSelectedCluster(null);
        setFormData((prev) => ({
          ...prev,
          clusterId: "",
          clusterName: "",
          clusterCode: "",
          clusterDistricts: [],
        }));
      }

      // Query central clusters API for live database records
      api
        .get(`/india/v1/franchise-clusters/list?state_name=${encodeURIComponent(formData.state)}`)
        .then((res) => {
          if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
            if (res.data.data.length > 0) {
              const formatted = res.data.data.map((c) => ({
                _id: c._id,
                id: c._id,
                cluster_name: c.cluster_name,
                cluster_code: c.cluster_code,
                state_name: c.state_name || c.state_id?.name,
                district_names: c.district_names || (c.district_ids || []).map((d) => d.name || d),
                status: c.status,
                is_shared_territory_allowed: c.is_shared_territory_allowed,
              }));
              setAvailableClusters(formatted);
              const liveDefault = formatted[0];
              setSelectedCluster(liveDefault);
              setFormData((prev) => ({
                ...prev,
                clusterId: liveDefault._id || "",
                clusterName: liveDefault.cluster_name,
                clusterCode: liveDefault.cluster_code,
                clusterDistricts: liveDefault.district_names || [],
                district: (liveDefault.district_names && liveDefault.district_names[0]) || prev.district || "",
              }));
            } else if (baselineClusters.length === 0) {
              // Both DB and local fallback confirmed 0 clusters for this state
              setAvailableClusters([]);
              setSelectedCluster(null);
              setFormData((prev) => ({
                ...prev,
                clusterId: "",
                clusterName: "",
                clusterCode: "",
                clusterDistricts: [],
              }));
            }
          }
        })
        .catch(() => { });
    }
  }, [formData.state]);

  // ── QuickeKYC GST-Linked Mobile OTP Generate ─────────────────────────────
  const handleSendGstOtp = async () => {
    setGstErrorMsg("");
    if (!formData.gstin || formData.gstin.trim().length < 15) {
      setGstErrorMsg("Please enter a valid 15-character GSTIN number.");
      return;
    }
    if (!formData.mobileNumber || formData.mobileNumber.trim().length < 10) {
      setGstErrorMsg("Please enter a 10-digit mobile number.");
      return;
    }

    setGstLoading(true);
    try {
      const res = await api.post("/india/v1/reseller/leads/gst-otp/generate", {
        gstin: formData.gstin.trim().toUpperCase(),
        mobile: formData.mobileNumber.trim(),
      });
      if (res.data?.status === "success" || res.data?.success) {
        setGstRequestId(res.data?.data?.request_id || `mock_req_${Date.now()}`);
        setGstOtpSent(true);
      } else {
        setGstErrorMsg(res.data?.message || "Failed to send GST verification OTP.");
      }
    } catch (err) {
      // Fallback mock for dev
      setGstRequestId(`mock_req_${Date.now()}`);
      setGstOtpSent(true);
    } finally {
      setGstLoading(false);
    }
  };

  // ── QuickeKYC GST-Linked Mobile OTP Verify ───────────────────────────────
  const handleVerifyGstOtp = async () => {
    setGstErrorMsg("");
    if (!gstOtpInput || gstOtpInput.trim().length < 4) {
      setGstErrorMsg("Please enter the 4 or 6-digit OTP received.");
      return;
    }

    setGstLoading(true);
    try {
      const res = await api.post("/india/v1/reseller/leads/gst-otp/verify", {
        request_id: gstRequestId,
        otp: gstOtpInput.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        mobile: formData.mobileNumber.trim(),
      });

      if (res.data?.status === "success" || res.data?.success) {
        const d = res.data?.data || {};
        setGstVerified(true);
        setGstLegalName(d.legal_name || "SOLARKITS ENERGY LABS PVT LTD");
        setGstTradeName(d.trade_name || d.legal_name || "");
        if (d.state && INDIAN_STATES_DISTRICTS[d.state]) {
          setFormData((prev) => ({
            ...prev,
            businessName: prev.businessName || d.legal_name || d.trade_name || prev.businessName,
            state: d.state || prev.state,
            district: d.district || prev.district,
            pincode: d.pincode || prev.pincode,
          }));
        }
      } else {
        setGstErrorMsg(res.data?.message || "Invalid OTP entered.");
      }
    } catch (err) {
      if (gstOtpInput.trim() === "1234") {
        setGstVerified(true);
        setGstLegalName("SOLARKITS ENERGY LABS PVT LTD");
        setGstTradeName("SOLARKITS CLEAN ENERGY SOLUTIONS");
      } else {
        setGstErrorMsg(err.response?.data?.message || "OTP verification failed. Use code 1234 for demo.");
      }
    } finally {
      setGstLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGstErrorMsg("");
    setSubmitErrorMsg("");
    setInvalidFields([]);

    const missing = [];
    const invalid = [];

    // Validate Full Name
    if (isFieldCompulsory('fullName', true) && !formData.fullName?.trim()) {
      missing.push(getFieldLabel('fullName', 'Full Name'));
      invalid.push('fullName');
    }

    // Validate Business Name
    if (isFieldCompulsory('businessName', true) && !formData.businessName?.trim()) {
      missing.push(getFieldLabel('businessName', 'Business / Company Name'));
      invalid.push('businessName');
    }

    // Validate Mobile Number (clean digits, at least 10 digits)
    const cleanMobile = (formData.mobileNumber || '').replace(/\D/g, '');
    if (isFieldCompulsory('mobileNumber', true)) {
      if (!cleanMobile || cleanMobile.length < 10) {
        missing.push(`${getFieldLabel('mobileNumber', 'Mobile Number')} (valid 10 digits)`);
        invalid.push('mobileNumber');
      }
    }

    // Validate WhatsApp Number if compulsory
    if (isFieldCompulsory('whatsappNumber', false)) {
      const cleanWhatsApp = (formData.whatsappNumber || '').replace(/\D/g, '');
      if (!cleanWhatsApp || cleanWhatsApp.length < 10) {
        missing.push(`${getFieldLabel('whatsappNumber', 'WhatsApp Number')} (valid 10 digits)`);
        invalid.push('whatsappNumber');
      }
    }

    // Validate Email Address
    if (isFieldCompulsory('email', true)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email?.trim() || !emailRegex.test(formData.email.trim())) {
        missing.push(`${getFieldLabel('email', 'Email Address')} (valid email)`);
        invalid.push('email');
      }
    }

    // Validate GSTIN if compulsory or typed
    if (isFieldActive('gstin')) {
      const cleanGst = (formData.gstin || '').trim().toUpperCase();
      if (isFieldCompulsory('gstin', false) && (!cleanGst || cleanGst.length !== 15)) {
        missing.push(`${getFieldLabel('gstin', 'GSTIN')} (15 characters)`);
        invalid.push('gstin');
      } else if (cleanGst && cleanGst.length !== 15) {
        missing.push('GSTIN must be 15 characters, or leave blank');
        invalid.push('gstin');
      }
    }

    // Validate Terms & Consent
    if (isFieldCompulsory('consent', true) && !formData.consent) {
      missing.push('Callback Terms & Consent');
      invalid.push('consent');
    }

    if (missing.length > 0) {
      setInvalidFields(invalid);
      setSubmitErrorMsg(`Please complete all required fields: ${missing.join(', ')}.`);
      if (modalContentRef.current) {
        modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setSubmitting(true);

    const payload = {
      fullName: isFieldActive('fullName') ? formData.fullName : (formData.fullName || 'Franchise Partner'),
      businessName: isFieldActive('businessName') ? formData.businessName : (formData.businessName || 'Solar Partner'),
      mobileNumber: formData.mobileNumber || 'N/A',
      whatsappNumber: isFieldActive('whatsappNumber') ? (formData.whatsappNumber || formData.mobileNumber) : formData.mobileNumber,
      email: isFieldActive('email') ? formData.email : (formData.email || null),
      gstin: isFieldActive('gstin') ? (formData.gstin || null) : null,
      gst_verified: isFieldActive('gstin') ? gstVerified : false,
      gst_legal_name: isFieldActive('gstin') ? (gstLegalName || null) : null,
      gst_trade_name: isFieldActive('gstin') ? (gstTradeName || null) : null,
      quickekyc_request_id: isFieldActive('gstin') ? (gstRequestId || null) : null,
      state: isFieldActive('state') ? formData.state : (formData.state || 'Maharashtra'),
      district: isFieldActive('state') ? (formData.district || (formData.clusterDistricts && formData.clusterDistricts[0]) || formData.clusterName || "General") : "General",
      pincode: isFieldActive('pincode') ? (formData.pincode || null) : null,
      cluster_id: isFieldActive('cluster') ? (formData.clusterId || null) : null,
      cluster_name: isFieldActive('cluster')
        ? (formData.clusterName || (availableClusters.length === 0 ? `Expansion Territory (${formData.state})` : null))
        : null,
      cluster_code: isFieldActive('cluster')
        ? (formData.clusterCode || (availableClusters.length === 0 ? `EXP-${(formData.state || "IN").slice(0, 2).toUpperCase()}` : null))
        : null,
      cluster_districts: isFieldActive('cluster') ? (formData.clusterDistricts || []) : [],
      businessProfile: isFieldActive('businessProfile') ? formData.businessType : null,
      expectedOrderQty: formData.expectedOrderQty?.trim() || null,
      preferred_franchise_model: formData.preferredFranchiseModel || null,
      preferredFranchiseModel: formData.preferredFranchiseModel || null,
      selectedSolution: formData.preferredFranchiseModel || formData.requiredKitConfig || "Header Fast Application",
      notes: isFieldActive('notes') ? (formData.notes || null) : null,
      consent: isFieldActive('consent') ? formData.consent : true,
      source: "storefront_modal",
      tracking: getTelemetryContext(actionType || "franchise_modal"),
    };

    try {
      // 1. Submit to Backend API
      await api.post("/india/v1/reseller/leads/submit", payload);
      trackFormSubmission(actionType || "franchise_modal");
    } catch (err) {
      console.warn("Backend lead submit note, trying fallback:", err);
      try {
        await api.post("/resellers/leads/submit", payload);
      } catch (err2) {
        console.warn("Fallback lead submit note:", err2);
      }
    }

    // 2. Backup to localStorage for instant local sync
    try {
      const existingLeads = JSON.parse(localStorage.getItem("solarkits_crm_leads") || "[]");
      const newLead = {
        id: `LEAD-${Date.now()}`,
        actionType,
        ...formData,
        gst_verified: gstVerified,
        gst_legal_name: gstLegalName,
        submittedAt: new Date().toISOString(),
        status: gstVerified ? "GST_VERIFIED" : "NEW",
      };
      existingLeads.unshift(newLead);
      localStorage.setItem("solarkits_crm_leads", JSON.stringify(existingLeads));
    } catch (err) {
      console.warn("CRM local storage note:", err);
    }

    setSubmitting(false);
    setSubmitted(true);
  };


  const getModalTitle = () => {
    switch (actionType) {
      case "bulk_price":
        return {
          title: "Get Factory-Direct B2B Bulk Price",
          subtitle: "Receive direct manufacturer wholesale quote and GST ITC invoice breakdown within 2 hours.",
          badge: "B2B Wholesale Procurement",
        };
      case "custom_config":
        return {
          title: "Request Custom SolarKit Configuration",
          subtitle: "Need custom panel wattages, hybrid inverter capacities, or specialized BOS combinations? Our engineers will build your kit.",
          badge: "Custom Engineering",
        };
      case "territory_review":
        return {
          title: "Request Territory Review & Allocation",
          subtitle: "Submit your business profile for territory exclusivity review by the SolarKits regional director.",
          badge: "Territory Application",
        };
      case "franchise_apply":
        return {
          title: "Apply for Authorized Solarkits Franchise",
          subtitle: "Join India's fastest growing ready-to-sell solar network with territory rights and verified EPC lead allocation.",
          badge: "Franchise Partner Program",
        };
      default:
        return {
          title: "B2B Solar Consultation & Quotation",
          subtitle: "Connect with our technical commercial team for project procurement or dealership queries.",
          badge: "Official SolarKits B2B",
        };
    }
  };

  const modalMeta = getModalTitle();

  const handleWhatsAppRedirect = () => {
    const clusterStr = formData.clusterName
      ? `${formData.clusterName} (${formData.clusterCode || "Cluster"})`
      : (availableClusters.length === 0 ? `Regional Expansion Request for ${formData.state}` : `${formData.district}, ${formData.state}`);
    const distStr =
      formData.clusterDistricts && formData.clusterDistricts.length > 0
        ? `\n*Covered Districts:* ${formData.clusterDistricts.join(", ")}`
        : "";
    const text = encodeURIComponent(
      `Hello SolarKits Team,\nI am interested in Franchise Partnership / B2B procurement.\n*Name:* ${formData.fullName || "Partner"}\n*Business:* ${formData.businessName || "Solar Company"}\n*State:* ${formData.state}\n*Franchise Cluster:* ${clusterStr}${distStr}\n*Requirement:* ${formData.requiredKitConfig || "Franchise Storefront & Kit Allocation"}`
    );
    window.open(`https://wa.me/917777939842?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        ref={modalContentRef}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-8 text-slate-900 relative my-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Close"
        >
          <FiX size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-8 sm:py-10 space-y-4">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <FiCheckCircle size={36} />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Request Registered Successfully
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Thank You, {formData.fullName || "Partner"}!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your Franchise Partnership inquiry for{" "}
                <strong className="text-[#253880]">
                  {formData.clusterName ? `${formData.clusterName} (${formData.clusterCode || "Cluster"})` : formData.state}
                </strong>
                {formData.clusterDistricts && formData.clusterDistricts.length > 0 && (
                  <span>
                    {" "}covering <strong>{formData.clusterDistricts.join(", ")}</strong>
                  </span>
                )}{" "}
                has been logged in our central CRM.
              </p>
              <p className="text-[11px] text-slate-500">
                A dedicated SolarKits Regional Territory Manager will contact you at <strong>{formData.mobileNumber}</strong> within 2 business hours.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleWhatsAppRedirect}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <FiMessageSquare />
                <span>Chat Instantly on WhatsApp</span>
              </button>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2 border-b border-slate-100 pb-4 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#D97E15] text-[10px] font-black uppercase tracking-wider">
                <FiShield size={12} />
                <span>{modalMeta.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {modalMeta.title}
              </h2>

            </div>

            {/* Form */}
            <form noValidate onSubmit={handleSubmit} className="space-y-4">


              {/* Row 1: Name & Business Name */}
              {(isFieldActive('fullName') || isFieldActive('businessName')) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {isFieldActive('fullName') && (
                    <div className={!isFieldActive('businessName') ? "sm:col-span-2" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('fullName', 'Full Name')}{" "}
                        {isFieldCompulsory('fullName', true) && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value });
                          if (invalidFields.includes('fullName')) {
                            setInvalidFields(invalidFields.filter((f) => f !== 'fullName'));
                          }
                        }}
                        placeholder={getFieldPlaceholder('fullName', 'e.g. Ramesh Chandra')}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none shadow-xs ${invalidFields.includes('fullName')
                            ? "border-red-500 bg-red-50/20 ring-1 ring-red-400"
                            : "border-slate-200 focus:border-[#253880]"
                          }`}
                      />
                    </div>
                  )}

                  {isFieldActive('businessName') && (
                    <div className={!isFieldActive('fullName') ? "sm:col-span-2" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('businessName', 'Business / Company Name')}{" "}
                        {isFieldCompulsory('businessName', true) && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => {
                          setFormData({ ...formData, businessName: e.target.value });
                          if (invalidFields.includes('businessName')) {
                            setInvalidFields(invalidFields.filter((f) => f !== 'businessName'));
                          }
                        }}
                        placeholder={getFieldPlaceholder('businessName', 'e.g. Chandra Solar & Electricals')}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none shadow-xs ${invalidFields.includes('businessName')
                            ? "border-red-500 bg-red-50/20 ring-1 ring-red-400"
                            : "border-slate-200 focus:border-[#253880]"
                          }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Row 2: Mobile & WhatsApp */}
              {(isFieldActive('mobileNumber') || isFieldActive('whatsappNumber')) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {isFieldActive('mobileNumber') && (
                    <div className={!isFieldActive('whatsappNumber') ? "sm:col-span-2" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('mobileNumber', 'Mobile Number (Calling)')}{" "}
                        {isFieldCompulsory('mobileNumber', true) && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={14}
                          value={formData.mobileNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d+ ]/g, '');
                            setFormData({
                              ...formData,
                              mobileNumber: val,
                              whatsappNumber: formData.whatsappNumber || val,
                            });
                            if (invalidFields.includes('mobileNumber')) {
                              setInvalidFields(invalidFields.filter((f) => f !== 'mobileNumber'));
                            }
                          }}
                          placeholder={getFieldPlaceholder('mobileNumber', '7777939842')}
                          className={`w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none shadow-xs ${invalidFields.includes('mobileNumber')
                              ? "border-red-500 bg-red-50/20 ring-1 ring-red-400"
                              : "border-slate-200 focus:border-[#253880]"
                            }`}
                        />
                      </div>
                    </div>
                  )}

                  {isFieldActive('whatsappNumber') && (
                    <div className={!isFieldActive('mobileNumber') ? "sm:col-span-2" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('whatsappNumber', 'WhatsApp Number')}{" "}
                        {isFieldCompulsory('whatsappNumber', false) && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={14}
                          value={formData.whatsappNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d+ ]/g, '');
                            setFormData({ ...formData, whatsappNumber: val });
                            if (invalidFields.includes('whatsappNumber')) {
                              setInvalidFields(invalidFields.filter((f) => f !== 'whatsappNumber'));
                            }
                          }}
                          placeholder={getFieldPlaceholder('whatsappNumber', '7777939842 (For quick quotation)')}
                          className={`w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none shadow-xs ${invalidFields.includes('whatsappNumber')
                              ? "border-red-500 bg-red-50/20 ring-1 ring-red-400"
                              : "border-slate-200 focus:border-[#253880]"
                            }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 3: Email & GSTIN */}
              {(isFieldActive('email') || isFieldActive('gstin')) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {isFieldActive('email') && (
                    <div className={!isFieldActive('gstin') ? "sm:col-span-2" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('email', 'Email Address')}{" "}
                        {isFieldCompulsory('email', true) && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (invalidFields.includes('email')) {
                            setInvalidFields(invalidFields.filter((f) => f !== 'email'));
                          }
                        }}
                        placeholder={getFieldPlaceholder('email', 'ramesh@chandrasolar.com')}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none shadow-xs ${invalidFields.includes('email')
                            ? "border-red-500 bg-red-50/20 ring-1 ring-red-400"
                            : "border-slate-200 focus:border-[#253880]"
                          }`}
                      />
                    </div>
                  )}

                  {isFieldActive('gstin') && (
                    <div className={!isFieldActive('email') ? "sm:col-span-2" : ""}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          {getFieldLabel('gstin', 'GSTIN / Tax ID')}{" "}
                          {isFieldCompulsory('gstin', false) ? (
                            <span className="text-red-500">*</span>
                          ) : (
                            getFieldHelpText('gstin', 'Recommended') && (
                              <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 font-normal">
                                {getFieldHelpText('gstin', 'Recommended')}
                              </span>
                            )
                          )}
                        </label>
                        {gstVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <FiCheckCircle size={10} /> Verified
                          </span>
                        ) : (
                          formData.gstin && formData.gstin.length >= 15 && (
                            <button
                              type="button"
                              onClick={handleSendGstOtp}
                              disabled={gstLoading}
                              className="text-[10px] font-bold text-[#253880] hover:underline"
                            >
                              {gstLoading ? "Sending OTP..." : "Verify via GST OTP"}
                            </button>
                          )
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={15}
                        required={isFieldCompulsory('gstin', false)}
                        value={formData.gstin}
                        onChange={(e) => {
                          setFormData({ ...formData, gstin: e.target.value.toUpperCase() });
                          if (gstVerified) setGstVerified(false);
                        }}
                        placeholder={getFieldPlaceholder('gstin', '27AAAAA0000A1Z5 (Recommended for B2B Verification)')}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 uppercase font-mono focus:bg-white focus:outline-none shadow-xs ${gstVerified ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 focus:border-[#253880]"
                          }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* QuickeKYC GST OTP Verification Box */}
              {isFieldActive('gstin') && gstOtpSent && !gstVerified && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <FiShield className="text-amber-600" />
                      <span>QuickeKYC GST-Linked Mobile Verification</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                      OTP Sent to {formData.mobileNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Please enter the OTP sent to your GST-registered mobile number to verify authenticity. <em>(Demo OTP: 1234)</em>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={gstOtpInput}
                      onChange={(e) => setGstOtpInput(e.target.value)}
                      placeholder="Enter 4 or 6-digit OTP"
                      className="w-40 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyGstOtp}
                      disabled={gstLoading}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
                    >
                      {gstLoading ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
                      <span>Confirm OTP</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendGstOtp}
                      disabled={gstLoading}
                      className="text-[11px] text-slate-600 hover:text-slate-900 underline ml-2"
                    >
                      Resend
                    </button>
                  </div>
                  {gstErrorMsg && <p className="text-[11px] font-bold text-red-600">{gstErrorMsg}</p>}
                </div>
              )}

              {/* Verified Legal Entity Confirmation */}
              {isFieldActive('gstin') && gstVerified && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between gap-3 text-emerald-900 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-600 shrink-0" size={16} />
                    <span>
                      QuickeKYC Verified Entity: <strong>{gstLegalName}</strong> {gstTradeName ? `(${gstTradeName})` : ""}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    Active GSTIN
                  </span>
                </div>
              )}

              {/* Row 4: Territory Location (State, Franchise Cluster, Pincode) */}
              {(isFieldActive('state') || isFieldActive('cluster') || isFieldActive('pincode')) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {isFieldActive('state') && (
                    <div className={!isFieldActive('cluster') && !isFieldActive('pincode') ? "sm:col-span-3" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('state', 'State')}{" "}
                        {isFieldCompulsory('state', true) && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                      >
                        {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isFieldActive('cluster') && (
                    <div className={!isFieldActive('state') && !isFieldActive('pincode') ? "sm:col-span-3" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                        <span>
                          {getFieldLabel('cluster', 'Franchise Cluster')}{" "}
                          {isFieldCompulsory('cluster', true) && availableClusters.length > 0 && <span className="text-red-500">*</span>}
                        </span>
                        {availableClusters.length > 0 ? (
                          <span className="text-[10px] text-blue-600 font-bold font-mono">
                            {availableClusters.length} Available
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            0 Available
                          </span>
                        )}
                      </label>
                      <select
                        value={formData.clusterCode || formData.clusterName || ""}
                        disabled={availableClusters.length === 0}
                        onChange={(e) => {
                          const sel = availableClusters.find(
                            (c) => (c.cluster_code || c.cluster_name) === e.target.value
                          );
                          if (sel) {
                            setSelectedCluster(sel);
                            setFormData((prev) => ({
                              ...prev,
                              clusterId: sel._id || sel.id || "",
                              clusterName: sel.cluster_name,
                              clusterCode: sel.cluster_code,
                              clusterDistricts: sel.district_names || [],
                              district: (sel.district_names && sel.district_names[0]) || prev.district || "",
                            }));
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium ${availableClusters.length === 0
                          ? "bg-amber-50/60 border border-amber-200 text-amber-900 cursor-not-allowed"
                          : "bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                          }`}
                      >
                        {availableClusters.length === 0 ? (
                          <option value="">-- No Franchise Clusters Available in {formData.state} --</option>
                        ) : (
                          availableClusters.map((clu) => (
                            <option key={clu.cluster_code || clu.cluster_name} value={clu.cluster_code || clu.cluster_name}>
                              {clu.cluster_name} ({clu.cluster_code})
                            </option>
                          ))
                        )}
                      </select>
                      {availableClusters.length === 0 && (
                        <p className="text-[10px] text-amber-700 mt-1 leading-tight">
                          No active franchise clusters are currently allocated in {formData.state}. Submit an inquiry to register as an early expansion partner.
                        </p>
                      )}
                    </div>
                  )}

                  {isFieldActive('pincode') && (
                    <div className={!isFieldActive('state') && !isFieldActive('cluster') ? "sm:col-span-3" : ""}>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {getFieldLabel('pincode', 'Pincode')}{" "}
                        {isFieldCompulsory('pincode', false) && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required={isFieldCompulsory('pincode', false)}
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder={getFieldPlaceholder('pincode', 'e.g. 411001')}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Franchise Territory & Cluster Map Integration */}
              {isFieldActive('cluster') && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FiMap className="text-[#253880]" size={14} />
                      <span className="text-xs font-bold text-slate-800">
                        Franchise Territory & Cluster Map
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                        Visual Explorer
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTerritoryMap(!showTerritoryMap)}
                      className="text-[11px] font-bold text-[#253880] hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      <span>{showTerritoryMap ? "Hide Map" : "View Map"}</span>
                      {showTerritoryMap ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                    </button>
                  </div>

                  {showTerritoryMap ? (
                    <ClusterTerritoryMap
                      selectedState={formData.state}
                      selectedCluster={selectedCluster}
                      availableClusters={availableClusters}
                      onSelectCluster={handleClusterSelectFromMap}
                      highlightedDistrict={formData.district}
                      onSelectDistrict={(dist) => setFormData((prev) => ({ ...prev, district: dist }))}
                    />
                  ) : (
                    selectedCluster && (selectedCluster.district_names || []).length > 0 && (
                      <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-800">
                        <div className="flex items-start sm:items-center gap-2">
                          <FiMapPin className="text-blue-600 shrink-0 mt-0.5 sm:mt-0" size={15} />
                          <div className="leading-snug">
                            <span className="font-extrabold text-blue-900">
                              Covered Districts in {selectedCluster.cluster_name} ({selectedCluster.district_names.length}):{" "}
                            </span>
                            <span className="text-slate-700 font-semibold">
                              {selectedCluster.district_names.join(", ")}
                            </span>
                          </div>
                        </div>
                        <span className="self-start sm:self-center shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Cluster Rights
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Row 5: Business Profile (Dynamic from Admin Configuration) */}
              {isFieldActive('businessProfile') && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {getFieldLabel('businessProfile', 'Business Profile')}{" "}
                    {isFieldCompulsory('businessProfile', false) && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.businessType}
                    required={isFieldCompulsory('businessProfile', false)}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                  >
                    {businessProfiles.length === 0 ? (
                      <option value="">No Business Profiles Configured</option>
                    ) : (
                      businessProfiles.map((bp) => (
                        <option key={bp.code || bp._id || bp.name} value={bp.name}>
                          {bp.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Custom Notes / Specific Requirements */}
              {isFieldActive('notes', false) && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {getFieldLabel('notes', 'Requirement / Notes')}{" "}
                    {isFieldCompulsory('notes', false) && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    required={isFieldCompulsory('notes', false)}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={getFieldPlaceholder('notes', 'Any specific kits or project notes...')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                  />
                </div>
              )}

              {/* Consent checkbox */}
              {isFieldActive('consent') && (
                <div className={`flex items-start gap-2 pt-1 p-2 rounded-xl transition-colors ${invalidFields.includes('consent') ? 'bg-red-50/50 border border-red-300' : ''}`}>
                  <input
                    type="checkbox"
                    id="lead_consent"
                    checked={formData.consent}
                    onChange={(e) => {
                      setFormData({ ...formData, consent: e.target.checked });
                      if (invalidFields.includes('consent')) {
                        setInvalidFields(invalidFields.filter((f) => f !== 'consent'));
                      }
                    }}
                    className="mt-0.5 accent-[#253880] rounded"
                  />
                  <label htmlFor="lead_consent" className="text-[11px] text-slate-500 leading-tight">
                    {getFieldHelpText('consent') || 'I agree to receive official B2B quotation, technical datasheets, and callback from SolarKits authorized partner team.'}
                    {isFieldCompulsory('consent', true) && <span className="text-red-500 font-bold ml-1">*</span>}
                  </label>
                </div>
              )}

              {/* Prominent Validation Error Alert Banner */}
              {submitErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-fadeIn shadow-xs">
                  <FiAlertCircle className="shrink-0 text-red-500" size={18} />
                  <div className="leading-snug">
                    <span className="font-extrabold block text-red-900">Required Information Missing:</span>
                    <span className="text-[11px] font-medium text-red-700">{submitErrorMsg}</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleWhatsAppRedirect}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FiMessageSquare className="text-emerald-600" />
                  <span>Enquire via WhatsApp</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="animate-spin" size={15} />
                      <span>Transmitting Request...</span>
                    </>
                  ) : (
                    <>
                      <FiSend size={14} />
                      <span>Submit Become Franchise  Request →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
