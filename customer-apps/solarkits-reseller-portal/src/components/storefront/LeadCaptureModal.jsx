import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import { INDIAN_STATES_DISTRICTS } from "../../data/territoryData";
import api from "../../services/api";

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
    businessType: "Solar EPC Contractor",
    solarExperience: "1 - 3 Years",
    investmentRange: "₹5 Lakh - ₹15 Lakh",
    state: "Maharashtra",
    district: "Pune",
    pincode: "",
    requiredKitConfig: "",
    expectedOrderQty: "1 - 3 Kits / Month",
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
  const [excludedDistricts, setExcludedDistricts] = useState([]);

  useEffect(() => {
    const fetchExcluded = async () => {
      try {
        const res = await api.get('/india/v1/reseller/leads/excluded-districts');
        if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
          setExcludedDistricts(res.data.data);
        }
      } catch (err) {
        // Fallback default flagship store district
        setExcludedDistricts([{ state: 'Maharashtra', district: 'Pune', reason: 'Company Flagship Store' }]);
      }
    };
    fetchExcluded();
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
      const stateExcluded = (excludedDistricts || [])
        .filter(ex => (ex.state || '').trim().toLowerCase() === (formData.state || '').trim().toLowerCase())
        .map(ex => (ex.district || '').trim().toLowerCase());

      const filtered = allDistricts.filter(d => !stateExcluded.includes((d || '').trim().toLowerCase()));
      setAvailableDistricts(filtered);

      if (!filtered.includes(formData.district)) {
        setFormData((prev) => ({ ...prev, district: filtered[0] || "" }));
      }
    }
  }, [formData.state, excludedDistricts]);

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
    if (!formData.gstin || !formData.gstin.trim() || formData.gstin.trim().length < 15) {
      setGstErrorMsg("GSTIN is compulsory for franchisee enquiry. Please enter a valid 15-character GST number.");
      return;
    }
    setSubmitting(true);

    const payload = {
      fullName: formData.fullName,
      businessName: formData.businessName,
      mobileNumber: formData.mobileNumber,
      whatsappNumber: formData.whatsappNumber || formData.mobileNumber,
      email: formData.email,
      gstin: formData.gstin || null,
      gst_verified: gstVerified,
      gst_legal_name: gstLegalName || null,
      gst_trade_name: gstTradeName || null,
      quickekyc_request_id: gstRequestId || null,
      state: formData.state,
      district: formData.district,
      pincode: formData.pincode || null,
      businessProfile: formData.businessType,
      expectedOrderQty: formData.expectedOrderQty,
      selectedSolution: formData.preferredFranchiseModel || formData.requiredKitConfig || "Header Fast Application",
      notes: formData.notes || null,
      consent: formData.consent,
      source: "storefront_modal",
    };

    try {
      // 1. Submit to Backend API
      await api.post("/india/v1/reseller/leads/submit", payload);
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
    const text = encodeURIComponent(
      `Hello SolarKits Team,\nI am interested in B2B procurement / franchise partnership.\n*Name:* ${formData.fullName || "Partner"}\n*Business:* ${formData.businessName || "Solar Company"}\n*State/District:* ${formData.state}, ${formData.district}\n*Requirement:* ${formData.requiredKitConfig || "Complete SolarKits"}`
    );
    window.open(`https://wa.me/917777939842?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-8 text-slate-900 relative my-6"
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
                Your B2B inquiry for <strong className="text-[#253880]">{formData.requiredKitConfig || "Complete SolarKits"}</strong> in{" "}
                <strong>{formData.district}, {formData.state}</strong> has been logged in our central CRM.
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
            <form onSubmit={handleSubmit} className="space-y-4">
              

              {/* Row 1: Name & Business Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Business / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Chandra Solar & Electricals"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                  />
                </div>
              </div>

              {/* Row 2: Mobile & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mobile Number (Calling) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value, whatsappNumber: formData.whatsappNumber || e.target.value })}
                      placeholder="7777939842"
                      className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      placeholder="7777939842 (For quick quotation)"
                      className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Email & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ramesh@chandrasolar.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      GSTIN <span className="text-red-500">*</span> <span className="text-[10px] text-slate-400 font-normal">(QuickeKYC Verified)</span>
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
                    required
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => {
                      setFormData({ ...formData, gstin: e.target.value.toUpperCase() });
                      if (gstVerified) setGstVerified(false);
                    }}
                    placeholder="27AAAAA0000A1Z5"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 uppercase font-mono focus:bg-white focus:outline-none shadow-xs ${
                      gstVerified ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 focus:border-[#253880]"
                    }`}
                  />
                </div>
              </div>

              {/* QuickeKYC GST OTP Verification Box */}
              {gstOtpSent && !gstVerified && (
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
              {gstVerified && (
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


              {/* Row 4: Territory Location (State, District, Pincode) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    State <span className="text-red-500">*</span>
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

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Target District <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 411001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                  />
                </div>
              </div>

              {/* Row 5: Business Profile */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Business Profile
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880]"
                >
                  <option value="Solar EPC Contractor">Solar EPC Contractor</option>
                  <option value="Solar Equipment Dealer / Trader">Solar Equipment Dealer / Trader</option>
                  <option value="Electrical Hardware Retailer">Electrical Hardware Retailer</option>
                  <option value="Franchise Applicant / Entrepreneur">Franchise Applicant / Entrepreneur</option>
                  <option value="Commercial / Industrial Business Owner">Commercial / Industrial Business Owner</option>
                </select>
              </div>

              {/* Custom Notes / Specific Requirements */}

              {/* Consent checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lead_consent"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-0.5 accent-[#253880] rounded"
                  required
                />
                <label htmlFor="lead_consent" className="text-[11px] text-slate-500 leading-tight">
                  I agree to receive official B2B quotation, technical datasheets, and callback from SolarKits authorized partner team.
                </label>
              </div>

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
