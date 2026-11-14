import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import {
  FiZap, FiCheckCircle, FiLoader, FiAlertCircle,
  FiShield, FiUser, FiMail, FiPhone, FiLock,
  FiMapPin, FiBriefcase, FiArrowRight, FiRefreshCw,
  FiTrendingUp, FiPackage,
} from "react-icons/fi";

// ── GST State Code → State Name Map (India) ──────────────────────────────────
const GST_STATE_MAP = {
  "01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh",
  "05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh",
  "10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur",
  "15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal",
  "20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh",
  "24":"Gujarat","25":"Daman & Diu","26":"Dadra & Nagar Haveli","27":"Maharashtra",
  "28":"Andhra Pradesh","29":"Karnataka","30":"Goa","31":"Lakshadweep","32":"Kerala",
  "33":"Tamil Nadu","34":"Puducherry","35":"Andaman & Nicobar Islands","36":"Telangana",
  "37":"Andhra Pradesh (New)","38":"Ladakh","97":"Other Territory","99":"Centre Jurisdiction",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const stepVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit:    { opacity: 0, x: -30, transition: { duration: 0.2, ease: "easeIn" } },
};

export default function Register() {
  const navigate = useNavigate();
  const gstInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1 = GST verify, 2 = details form
  const [types, setTypes] = useState([]);

  // Step 1 — GST state
  const [gstInput, setGstInput] = useState("");
  const [gstVerifying, setGstVerifying] = useState(false);
  const [gstError, setGstError] = useState("");
  const [gstResult, setGstResult] = useState(null); // { legal_name, trade_name, ... }

  // Step 2 — Form state
  const [form, setForm] = useState({
    business_name:    "",
    contact_person:   "",
    email:            "",
    mobile:           "",
    password:         "",
    confirm_password: "",
    reseller_type_id: "",
    commercial_mode:  "commission",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess]   = useState(false);

  // Derived State Name
  const gstStateName = gstInput.length >= 2
    ? (GST_STATE_MAP[gstInput.substring(0, 2).toUpperCase()] || null)
    : null;

  useEffect(() => {
    api.get("/india/v1/reseller/types")
      .then((res) => { if (res.data?.status === "success") setTypes(res.data.data); })
      .catch(() => {});
  }, []);

  // Sync commercial_mode when type selection changes
  const handleTypeChange = (typeId) => {
    const matched = types.find((t) => (t.id || t._id) === typeId);
    setForm((f) => ({
      ...f,
      reseller_type_id: typeId,
      commercial_mode:  matched?.commercial_mode || f.commercial_mode,
    }));
  };

  // ── GST Verify Action ───────────────────────────────────────────────────────
  const handleVerifyGst = async () => {
    const gstin = gstInput.trim().toUpperCase();
    setGstError("");

    if (!gstin) { setGstError("Please enter your GSTIN number."); return; }
    if (!GSTIN_REGEX.test(gstin)) {
      setGstError("Invalid GSTIN format. Example: 27ABCDE1234F1Z5");
      return;
    }

    setGstVerifying(true);
    try {
      const res = await api.post("/india/v1/reseller/gst/verify", { gstin });
      if (res.data?.status === "success") {
        const d = res.data.data;
        setGstResult(d);
        const bizName = d.legal_name || d.trade_name || "";
        setForm((f) => ({
          ...f,
          business_name: bizName,
        }));
      } else {
        setGstError(res.data?.message || "GST verification failed.");
      }
    } catch (err) {
      setGstError(err.response?.data?.message || "Could not verify GSTIN. Please try again.");
    } finally {
      setGstVerifying(false);
    }
  };

  const handleProceedToForm = () => {
    if (!gstResult) return;
    setStep(2);
  };

  const handleResetGst = () => {
    setGstResult(null);
    setGstError("");
    setGstInput("");
    setStep(1);
    setTimeout(() => gstInputRef.current?.focus(), 100);
  };

  // ── Submit Registration ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (form.password !== form.confirm_password) {
      setFormError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (!form.reseller_type_id) {
      setFormError("Please select a Franchisee Type.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_name:    form.business_name.trim(),
        contact_person:   form.contact_person.trim(),
        email:            form.email.trim().toLowerCase(),
        mobile:           form.mobile.trim(),
        password:         form.password,
        reseller_type_id: form.reseller_type_id,
        commercial_mode:  form.commercial_mode,
        gst_number:       gstInput.trim().toUpperCase(),
        gst_verified:     !!gstResult,
        gst_legal_name:   gstResult?.legal_name || null,
        gst_trade_name:   gstResult?.trade_name || null,
      };

      const res = await api.post("/india/v1/reseller/auth/register", payload);
      if (res.data?.status === "success") {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setFormError(res.data?.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Registration failed. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white border border-slate-300 rounded-3xl p-8 shadow-2xl text-center space-y-4"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <FiCheckCircle size={44} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Application Submitted!</h2>
          <p className="text-sm text-slate-600">
            Your franchisee partner application has been submitted successfully. Our admin team will verify and activate your account.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
            <FiLoader className="animate-spin" size={16} /> Redirecting to login portal...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 space-y-2"
        >
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <FiZap size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Become a Solar Franchisee Partner
          </h1>
          <p className="text-sm font-medium text-slate-600">
            Register your business account for wholesale margins & commissions
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                step >= 1
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {step > 1 ? <FiCheckCircle size={15} /> : 1}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? "text-blue-700" : "text-slate-400"}`}>
              1. GST Verify
            </span>
          </div>

          <div className={`w-12 h-1 rounded-full ${step > 1 ? "bg-blue-600" : "bg-slate-300"}`} />

          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                step >= 2
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              2
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? "text-blue-700" : "text-slate-400"}`}>
              2. Business Details
            </span>
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-300 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {/* ════════════════════════════════════════════
                STEP 1 — GSTIN Verification
            ════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div key="step1" {...stepVariants} className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FiShield className="text-blue-600" size={20} /> Verify Your GSTIN
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your 15-digit GST number. Your legal business details and territory location will be verified automatically.
                  </p>
                </div>

                {/* GSTIN Input Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    GSTIN Number *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      ref={gstInputRef}
                      id="gstin-input"
                      type="text"
                      maxLength={15}
                      placeholder="27ABCDE1234F1Z5"
                      value={gstInput}
                      onChange={(e) => {
                        setGstInput(e.target.value.toUpperCase());
                        setGstError("");
                        setGstResult(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyGst()}
                      className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      id="verify-gst-btn"
                      type="button"
                      onClick={handleVerifyGst}
                      disabled={gstVerifying}
                      className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {gstVerifying ? (
                        <>
                          <FiLoader className="animate-spin" size={16} /> Verifying...
                        </>
                      ) : (
                        <>
                          <FiShield size={16} /> Verify GST
                        </>
                      )}
                    </button>
                  </div>

                  {/* Auto-detected state hint */}
                  {gstStateName && !gstResult && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-1">
                      <FiMapPin className="text-blue-600" size={13} />
                      State detected: <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">{gstStateName}</span>
                    </div>
                  )}

                  {/* Error banner */}
                  {gstError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"
                    >
                      <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
                      <span>{gstError}</span>
                    </motion.div>
                  )}
                </div>

                {/* GST Verification Success Card */}
                {gstResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <FiCheckCircle size={20} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                            GST Verification Successful ✓
                          </span>
                          <p className="text-[11px] text-emerald-700 font-medium">Business entity validated on GST registry</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetGst}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <FiRefreshCw size={11} /> Change
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2 text-xs">
                      {gstResult.legal_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <FiBriefcase size={12} className="text-slate-400" /> Legal Name:
                          </span>
                          <span className="font-extrabold text-slate-900">{gstResult.legal_name}</span>
                        </div>
                      )}
                      {gstResult.trade_name && gstResult.trade_name !== gstResult.legal_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <FiBriefcase size={12} className="text-slate-400" /> Trade Name:
                          </span>
                          <span className="font-bold text-slate-800">{gstResult.trade_name}</span>
                        </div>
                      )}
                      {gstStateName && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <FiMapPin size={12} className="text-slate-400" /> Assigned State:
                          </span>
                          <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">{gstStateName}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Proceed Button */}
                <button
                  id="proceed-to-form-btn"
                  type="button"
                  onClick={handleProceedToForm}
                  disabled={!gstResult}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Registration <FiArrowRight size={18} />
                </button>

                <p className="text-center text-xs text-slate-500 font-medium">
                  State & location rules will automatically map to your verified GST state code
                </p>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════
                STEP 2 — Business & Contact Details Form
            ════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div key="step2" {...stepVariants}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Verified Header Banner */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="text-blue-600 flex-shrink-0" size={16} />
                      <div>
                        <span className="font-extrabold text-blue-900">GST: {gstInput}</span>
                        {gstStateName && (
                          <span className="ml-2 font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                            {gstStateName}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetGst}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Change GST
                    </button>
                  </div>

                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-100 text-red-700 text-xs font-semibold border border-red-300 flex items-center gap-2"
                    >
                      <FiAlertCircle size={16} />
                      <span>{formError}</span>
                    </motion.div>
                  )}

                  {/* Business & Contact Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Company / Business Name *
                      </label>
                      <div className="relative">
                        <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          id="business-name"
                          type="text"
                          required
                          placeholder="Apex Solar Energy Pvt Ltd"
                          value={form.business_name}
                          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contact Person Name *
                      </label>
                      <div className="relative">
                        <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          id="contact-person"
                          type="text"
                          required
                          placeholder="Rajesh Kumar"
                          value={form.contact_person}
                          onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Business Email *
                      </label>
                      <div className="relative">
                        <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          id="email"
                          type="email"
                          required
                          placeholder="rajesh@apexsolar.in"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile / WhatsApp *
                      </label>
                      <div className="relative">
                        <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          id="mobile"
                          type="tel"
                          required
                          placeholder="7777939842"
                          value={form.mobile}
                          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Franchisee Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Franchisee Type *
                    </label>
                    <div className="relative">
                      <FiPackage className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        id="reseller-type"
                        required
                        value={form.reseller_type_id}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Franchisee Category...</option>
                        {types.map((t) => (
                          <option key={t.id || t._id} value={t.id || t._id}>
                            {t.name}{t.commercial_mode ? ` (${t.commercial_mode})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Operating Mode Toggle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Preferred Operating Mode *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        id="mode-commission"
                        type="button"
                        onClick={() => setForm({ ...form, commercial_mode: "commission" })}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.commercial_mode === "commission"
                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FiTrendingUp className={form.commercial_mode === "commission" ? "text-blue-600" : "text-slate-400"} size={16} />
                          <span className="text-xs font-extrabold">Commission Mode</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Refer EPC Buyers & Earn Margins</p>
                      </button>

                      <button
                        id="mode-dealer"
                        type="button"
                        onClick={() => setForm({ ...form, commercial_mode: "dealer" })}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.commercial_mode === "dealer"
                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FiPackage className={form.commercial_mode === "dealer" ? "text-blue-600" : "text-slate-400"} size={16} />
                          <span className="text-xs font-extrabold">Dealer Mode</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Wholesale Stock Purchase & Sell</p>
                      </button>
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Create Password *
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          id="password"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          id="confirm-password"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={form.confirm_password}
                          onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="submit-register-btn"
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {submitting ? (
                      <>
                        <FiLoader className="animate-spin" size={18} /> Submitting Application...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle size={18} /> Submit Franchisee Application
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-600 font-medium mt-6">
          Already have a franchisee account?{" "}
          <Link to="/login" id="go-to-login-link" className="text-blue-600 font-extrabold hover:underline underline-offset-2">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
