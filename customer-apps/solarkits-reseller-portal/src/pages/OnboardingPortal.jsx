import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiShield,
  FiCheckCircle,
  FiFileText,
  FiCreditCard,
  FiUploadCloud,
  FiShoppingBag,
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiX,
  FiLoader,
  FiLogOut,
  FiLock,
  FiClock,
  FiPhoneCall,
  FiAlertCircle,
  FiEye,
  FiExternalLink,
  FiDownload,
  FiZap,
  FiUserCheck,
  FiMapPin,
  FiLayers,
  FiTool,
} from "react-icons/fi";
import { FaStore, FaAward } from "react-icons/fa";
import api from "../services/api";
import logoImg from "@/assets/images/logo.png";

export default function OnboardingPortal() {
  const navigate = useNavigate();
  const token = localStorage.getItem("reseller_token");

  // Helper to format full URL for documents
  const getDocumentFullUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const serverBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
    const cleanPath = url.replace(/^[\\/]+/, "").replace(/\\/g, "/");
    return `${serverBase}/${cleanPath}`;
  };

  const [reseller, setReseller] = useState(() => {
    try {
      const saved = localStorage.getItem("reseller_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Modals & Active Action States
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [storeSetupModalOpen, setStoreSetupModalOpen] = useState(false);

  // Store Setup Data State
  const [storeSetupData, setStoreSetupData] = useState(null);

  // Agreement State
  const [agreementData, setAgreementData] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [signerDesignation, setSignerDesignation] = useState("Authorized Signatory / Proprietor");
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [agreementFile, setAgreementFile] = useState(null);
  const [signingLoading, setSigningLoading] = useState(false);
  const [agreementError, setAgreementError] = useState("");

  // Payment Info & Receipt Upload State
  const [feeInfo, setFeeInfo] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState(50000);
  const [senderBank, setSenderBank] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [masterChecklist, setMasterChecklist] = useState([]);

  const handleCopyText = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const fetchStoreSetup = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/store-setup/my-setup");
      if (res.data?.status === "success" && res.data?.data) {
        setStoreSetupData(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch store setup:", err);
    }

    try {
      const resMaster = await api.get("/india/v1/reseller/store-setup/master-checklist");
      if (resMaster.data?.status === "success" && resMaster.data?.data?.activities) {
        setMasterChecklist(resMaster.data.data.activities);
      }
    } catch (err) {
      console.warn("Failed to fetch master checklist:", err);
    }
  }, []);

  const fetchMe = useCallback(async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const res = await api.get("/india/v1/reseller/auth/me");
      if (res.data?.status === "success") {
        const userData = res.data.data || res.data.user;
        if (userData) {
          setReseller(userData);
          localStorage.setItem("reseller_user", JSON.stringify(userData));
          if (!signerName) {
            setSignerName(userData.contact_person || userData.business_name || "");
          }
          if (userData.fee_payment_utr && !utrNumber) {
            setUtrNumber(userData.fee_payment_utr);
          }
          if (userData.fee_payment_amount) {
            setAmountPaid(userData.fee_payment_amount);
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("reseller_token");
        localStorage.removeItem("reseller_user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate, signerName, utrNumber]);

  const loadAgreement = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/agreement/current");
      if (res.data?.status === "success") {
        setAgreementData(res.data.data?.agreement);
      }
    } catch (err) {
      console.warn("Failed to load agreement details:", err);
    }
  }, []);

  const loadFeeInfo = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/fee-payment/info");
      if (res.data?.status === "success") {
        setFeeInfo(res.data.data);
        const fee = res.data.data?.setup_fee || res.data.data?.fee_amount || res.data.data?.plan?.fee_amount;
        if (fee) {
          setAmountPaid(fee);
        }
      }
    } catch (err) {
      console.warn("Failed to load fee info:", err);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    fetchStoreSetup();
    loadAgreement();
    loadFeeInfo();
    const interval = setInterval(() => {
      fetchMe();
      fetchStoreSetup();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchMe, fetchStoreSetup, loadAgreement, loadFeeInfo]);

  useEffect(() => {
    if (agreementModalOpen) loadAgreement();
  }, [agreementModalOpen]);

  useEffect(() => {
    if (paymentModalOpen) loadFeeInfo();
  }, [paymentModalOpen]);

  const handleLogout = () => {
    localStorage.removeItem("reseller_token");
    localStorage.removeItem("reseller_user");
    navigate("/login");
  };

  // Sign Agreement Action
  const handleSignAgreement = async (e) => {
    e.preventDefault();
    setAgreementError("");
    if (!signerName.trim()) {
      setAgreementError("Please enter your full legal signatory name.");
      return;
    }
    if (!consentAgreed) {
      setAgreementError("Please agree to the franchise terms and conditions.");
      return;
    }

    setSigningLoading(true);
    try {
      let res;
      if (agreementFile) {
        const formData = new FormData();
        formData.append("agreement_id", agreementData?._id || "");
        formData.append("signer_name", signerName.trim());
        formData.append("signer_designation", signerDesignation.trim());
        formData.append("consent_agreed", "true");
        formData.append("document", agreementFile);
        formData.append("file", agreementFile);

        res = await api.post("/india/v1/reseller/agreement/sign", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post("/india/v1/reseller/agreement/sign", {
          agreement_id: agreementData?._id,
          signer_name: signerName.trim(),
          signer_designation: signerDesignation.trim(),
          consent_agreed: true,
        });
      }

      if (res.data?.status === "success") {
        setAgreementModalOpen(false);
        fetchMe();
      } else {
        setAgreementError(res.data?.message || "Failed to sign agreement.");
      }
    } catch (err) {
      setAgreementError(err.response?.data?.message || "Failed to sign agreement. Please try again.");
    } finally {
      setSigningLoading(false);
    }
  };

  // Upload Payment Receipt Action
  const handleUploadReceipt = async (e) => {
    e.preventDefault();
    setUploadError("");
    if (!utrNumber.trim()) {
      setUploadError("Please provide the Bank UTR / IMPS / NEFT Reference number.");
      return;
    }

    const formData = new FormData();
    formData.append("utr_number", utrNumber.trim().toUpperCase());
    formData.append("amount_paid", amountPaid);
    formData.append("payment_date", paymentDate);
    formData.append("sender_bank_name", senderBank.trim());
    if (receiptFile) {
      formData.append("document", receiptFile);
      formData.append("file", receiptFile);
    }

    setUploadLoading(true);
    try {
      const res = await api.post("/india/v1/reseller/fee-payment/upload-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "success") {
        setPaymentModalOpen(false);
        fetchMe();
        fetchStoreSetup();
      } else {
        setUploadError(res.data?.message || "Failed to upload payment receipt.");
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || "Receipt upload failed. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  // State Evaluation
  const isGstVerified = Boolean(reseller?.gst_number || reseller?.gst_verified_at);
  const isApproved = reseller?.activation_status !== "rejected" && reseller?.activation_status !== "draft";
  const isAgreementSigned = reseller?.agreement_status === "signed";
  const isReceiptUploaded = reseller?.fee_payment_status === "receipt_uploaded" || reseller?.fee_payment_status === "verified";
  const isReceiptVerified = reseller?.fee_payment_status === "verified";

  // Store Setup Evaluation
  const setup = storeSetupData?.setup;
  const checklist = (storeSetupData?.checklist && storeSetupData.checklist.length > 0)
    ? storeSetupData.checklist
    : masterChecklist;
  const isStoreSetupCompleted = Boolean(
    setup && (
      setup.status === "admin_verified" ||
      setup.status === "setup_completed" ||
      setup.status === "operations_started"
    )
  );
  const isStoreSetupInProgress = Boolean(isReceiptVerified && setup && !isStoreSetupCompleted);

  // Operations Live Evaluation
  const isAccountActive = Boolean(
    reseller?.is_operational === true ||
    (reseller?.activation_status === "active" && (isStoreSetupCompleted || setup?.status === "operations_started"))
  );

  const completedStepsCount = [
    isGstVerified,
    isApproved,
    isAgreementSigned,
    isReceiptUploaded,
    isReceiptVerified,
    isStoreSetupCompleted,
    isAccountActive,
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedStepsCount / 7) * 100);

  const primaryName = reseller?.contact_person || reseller?.business_name || "Franchise Partner";
  const companyName = reseller?.business_name || "Partner Enterprise";

  const getInitials = (name) => {
    if (!name) return "FP";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(primaryName);

  if (loading && !reseller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <FiLoader size={40} className="animate-spin text-[#253880]" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* ── Bright Top Navigation Bar ──────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="SolarKits" className="h-10 w-auto" />
            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F49222] block">
                Partner Activation Workspace
              </span>
              <span className="text-xs font-bold text-slate-600">
                Pre-Onboarding, Store Setup & Verification Pipeline
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5 text-right hidden sm:block">
              <p className="text-sm font-extrabold text-slate-900 leading-tight">{primaryName}</p>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{companyName}</p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#253880] to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              {userInitials}
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer ml-1 flex items-center gap-1.5 text-xs font-bold"
              title="Sign Out"
            >
              <FiLogOut size={15} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Onboarding Container ───────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Vibrant Bright Welcome Hero Banner */}
        <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-gradient-to-r from-[#253880] via-[#0066A2] to-[#1d2c66] text-white shadow-xl relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-[#F49222]/30 blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#F49222] text-slate-950 shadow-xs">
                  Step-by-Step Partner Activation
                </span>
                <span className="text-xs text-blue-100 font-semibold bg-white/15 px-3 py-1 rounded-full backdrop-blur-xs border border-white/20">
                  {isAccountActive
                    ? "✓ All Steps Completed — Operations 100% Live"
                    : isStoreSetupCompleted
                      ? "Step 7 Pending: Final Launch & Operations Activation"
                      : isReceiptVerified
                        ? "Step 6 In Progress: Physical Store Setup & Inspection"
                        : isReceiptUploaded
                          ? "Step 5 Pending: Receipt Verification by Admin"
                          : isAgreementSigned
                            ? "Step 4 Pending: Offline Payment Receipt Required"
                            : "Step 3 Pending: Legal Agreement Execution Required"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Welcome, {primaryName}</span>
                {isAccountActive && (
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-400 text-slate-950 shadow-sm">
                    Active Partner
                  </span>
                )}
              </h1>

              <p className="text-sm sm:text-base text-blue-50 max-w-2xl leading-relaxed font-medium">
                {isAccountActive
                  ? "Congratulations! Your franchise retail operations are fully active. You now have complete access to wholesale catalog ordering, distributor pricing, and customer allocations."
                  : isStoreSetupInProgress
                    ? "Fee payment confirmed! Complete your 16-step physical store setup & branding checklist with our assigned State Coordinator to unlock retail operations."
                    : "Complete your onboarding sequence step-by-step below. Store setup record is initialized automatically upon fee payment confirmation."}
              </p>
            </div>

            {/* Progress Gauge */}
            <div className="shrink-0 flex items-center gap-4 bg-white/15 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/25 shadow-sm">
              <div className="text-right">
                <div className="text-xs text-blue-100 font-medium">Onboarding Progress</div>
                <div className="text-2xl font-black text-white">{progressPercent}%</div>
              </div>
              <div className="w-18 h-18 relative flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#F49222] transition-all duration-700 ease-out"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-sm font-black text-white">{completedStepsCount}/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7-Step Visual Pipeline Cards (Complete Sequence) ──────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5">
          {/* Step 1 */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isGstVerified
              ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-950 shadow-xs"
              : "border-slate-200 bg-white shadow-xs"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-emerald-600 text-white shadow-xs shrink-0">
                  1
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap inline-flex items-center gap-1">
                  <FiCheck size={10} className="stroke-[3]" /> VERIFIED
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FiShield size={16} className="text-emerald-600 shrink-0" />
                <span>Lead & GST</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">QuickeKYC Authenticated</p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-200 text-[10px] font-bold text-emerald-800 truncate">
              GST: {reseller?.gst_number || "24AAACS1234F1Z8"}
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isApproved
              ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-950 shadow-xs"
              : "border-slate-200 bg-white shadow-xs"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-emerald-600 text-white shadow-xs shrink-0">
                  2
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap inline-flex items-center gap-1">
                  <FiCheck size={10} className="stroke-[3]" /> APPROVED
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FiCheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>Admin Review</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">Eligibility Confirmed</p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-200 text-[10px] font-bold text-emerald-800 truncate">
              Model: {reseller?.commercial_mode || "Commission"}
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isAgreementSigned
              ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-950 shadow-xs"
              : "border-[#253880] bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-md"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isAgreementSigned ? "bg-emerald-600 text-white" : "bg-[#253880] text-white"
                  }`}>
                  3
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${isAgreementSigned
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-[#253880] text-white"
                  }`}>
                  {isAgreementSigned ? <><FiCheck size={10} /> SIGNED</> : "ACTION REQUIRED"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FiFileText size={16} className={isAgreementSigned ? "text-emerald-600" : "text-[#253880]"} />
                <span>Agreement Signing</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {isAgreementSigned ? "Signed" : "Legal Contract"}
              </p>
            </div>
            <div className="mt-3">
              <button
                onClick={() => setAgreementModalOpen(true)}
                className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${isAgreementSigned ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-[#253880] hover:bg-[#1d2c66] text-white"
                  }`}
              >
                <span>{isAgreementSigned ? "View Agreement" : "Sign Agreement →"}</span>
              </button>
            </div>
          </div>

          {/* Step 4 */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isReceiptUploaded
              ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-950 shadow-xs"
              : isAgreementSigned
                ? "border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/20 shadow-md"
                : "border-slate-200 bg-white/70 text-slate-400 opacity-60"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isReceiptUploaded ? "bg-emerald-600 text-white" : isAgreementSigned ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  4
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${isReceiptUploaded
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isAgreementSigned
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-500"
                  }`}>
                  {isReceiptUploaded ? <><FiCheck size={10} /> TRANSFERRED</> : isAgreementSigned ? "PAYMENT PENDING" : <><FiLock size={9} /> LOCKED</>}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FiCreditCard size={16} className={isReceiptUploaded ? "text-emerald-600" : "text-amber-700"} />
                <span>Offline Fee</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {isReceiptUploaded ? `UTR: ${reseller?.fee_payment_utr || "Recorded"}` : "Bank Transfer"}
              </p>
            </div>
            <div className="mt-3">
              {isAgreementSigned ? (
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${isReceiptUploaded ? "bg-slate-800 hover:bg-slate-900 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                >
                  <span>{isReceiptUploaded ? "Payment Info" : "Upload Receipt →"}</span>
                </button>
              ) : (
                <div className="text-center py-1 px-2 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                  <FiLock size={10} /> Step 3 First
                </div>
              )}
            </div>
          </div>

          {/* Step 5 */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isReceiptVerified
              ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-950 shadow-xs"
              : isReceiptUploaded
                ? "border-sky-400 bg-sky-50 text-sky-950 ring-2 ring-sky-400/20 shadow-md"
                : "border-slate-200 bg-white/70 text-slate-400 opacity-60"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isReceiptVerified ? "bg-emerald-600 text-white" : isReceiptUploaded ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  5
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${isReceiptVerified
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isReceiptUploaded
                    ? "bg-sky-100 text-sky-900 border border-sky-300"
                    : "bg-slate-100 text-slate-500"
                  }`}>
                  {isReceiptVerified ? <><FiCheck size={10} /> CONFIRMED</> : isReceiptUploaded ? "UNDER REVIEW" : <><FiLock size={9} /> LOCKED</>}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FiUploadCloud size={16} className={isReceiptVerified ? "text-emerald-600" : "text-sky-600"} />
                <span>Fee Verified</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {isReceiptVerified ? "Payment Confirmed" : isReceiptUploaded ? "Admin Reviewing" : "Slip Pending"}
              </p>
            </div>
            <div className="mt-3">
              {isReceiptUploaded ? (
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full py-1.5 px-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <span>Slip Details</span>
                </button>
              ) : (
                <div className="text-center py-1 px-2 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                  <FiLock size={10} /> Locked
                </div>
              )}
            </div>
          </div>

          {/* Step 6: Physical Store Setup & Inspection (NEW CRITICAL STAGE) */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isStoreSetupCompleted
              ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-950 shadow-xs"
              : isStoreSetupInProgress
                ? "border-amber-500 bg-amber-50/90 text-amber-950 ring-3 ring-amber-500/25 shadow-lg shadow-amber-500/10"
                : "border-slate-200 bg-white/70 text-slate-400 opacity-60"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isStoreSetupCompleted ? "bg-emerald-600 text-white" : isStoreSetupInProgress ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  6
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${isStoreSetupCompleted
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isStoreSetupInProgress
                    ? "bg-amber-100 text-amber-900 border border-amber-300 font-black"
                    : "bg-slate-100 text-slate-500"
                  }`}>
                  {isStoreSetupCompleted ? (
                    <><FiCheck size={10} /> VERIFIED</>
                  ) : isStoreSetupInProgress ? (
                    setup?.status === "admin_verification_pending" ? "INSPECTION DONE" : `SETUP (${setup?.progress_percentage || 0}%)`
                  ) : (
                    <><FiLock size={9} /> LOCKED</>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FaStore size={16} className={isStoreSetupCompleted ? "text-emerald-600" : isStoreSetupInProgress ? "text-amber-600" : "text-slate-400"} />
                <span>Store Setup</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {isStoreSetupCompleted
                  ? "Store Verified & Ready"
                  : isStoreSetupInProgress
                    ? `${setup?.completed_activities || 0}/${setup?.total_activities || 16} Checklist Steps`
                    : "Physical Store Checklist"}
              </p>
            </div>
            <div className="mt-3">
              {isReceiptVerified ? (
                <button
                  onClick={() => setStoreSetupModalOpen(true)}
                  className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${isStoreSetupCompleted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 active:scale-[0.98]"
                    }`}
                >
                  <span>{isStoreSetupCompleted ? "View Store Record" : "Track Store Setup →"}</span>
                </button>
              ) : (
                <div className="text-center py-1 px-2 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                  <FiLock size={10} /> Locked
                </div>
              )}
            </div>
          </div>

          {/* Step 7: Operations Start */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 ${isAccountActive
              ? "border-emerald-400 bg-emerald-100/90 text-emerald-950 shadow-md ring-3 ring-emerald-500/20"
              : "border-slate-200 bg-white/70 text-slate-400 opacity-60"
              }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isAccountActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  7
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${isAccountActive ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
                  }`}>
                  {isAccountActive ? <><FiCheckCircle size={10} /> 100% ACTIVE</> : <><FiLock size={9} /> LOCKED</>}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                <FiShoppingBag size={16} className={isAccountActive ? "text-emerald-700" : "text-slate-400"} />
                <span>Operations Start</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {isAccountActive ? "Retail Ordering Live" : "Awaiting Store Setup"}
              </p>
            </div>
            <div className="mt-3">
              {isAccountActive ? (
                <Link
                  to="/dashboard"
                  className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer animate-bounce"
                >
                  <span>Dashboard →</span>
                </Link>
              ) : (
                <div className="text-center py-1 px-2 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                  <FiLock size={10} /> Locked
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Active Action Guidance Box (Bright Card) ─────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>Current Onboarding Stage:</span>
                <span className="text-[#253880]">
                  {isAccountActive
                    ? "Phase 5: Operations Live & Active Retailer"
                    : isStoreSetupCompleted
                      ? "Phase 4: Store Verified — Final Activation Pending"
                      : isStoreSetupInProgress
                        ? "Phase 4: Physical Store Setup & Inspection"
                        : isReceiptUploaded
                          ? "Phase 3: Administrative Receipt Verification"
                          : isAgreementSigned
                            ? "Phase 2: Offline Fee Payment & Receipt Submission"
                            : "Phase 1: Legal Agreement Review & Execution"}
                </span>
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {isStoreSetupInProgress
                  ? "Fee payment confirmed! Complete your 16-step physical store checklist with your assigned state coordinator to get verified."
                  : "Each step must be completed in order. Once store setup is verified by Admin, you will gain full access to live retail ordering."}
              </p>
            </div>

            {isAccountActive && (
              <Link
                to="/dashboard"
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black inline-flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <span>Enter Franchise Dashboard</span>
                <FiArrowRight size={18} />
              </Link>
            )}
          </div>

          {/* Interactive Guided Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
            {/* Action 1: Sign Agreement */}
            <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${isAgreementSigned
              ? "border-emerald-200 bg-emerald-50/50 shadow-xs"
              : "border-[#253880] bg-blue-50/60 shadow-md ring-2 ring-blue-500/20"
              }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-base text-slate-900 flex items-center gap-2">
                    <FiFileText size={18} className="text-[#253880]" /> Step 3: Agreement
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${isAgreementSigned ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-900 border border-blue-200"
                    }`}>
                    {isAgreementSigned ? "✓ Completed" : "Action Needed"}
                  </span>
                </div>

                {agreementData ? (
                  <div className="space-y-2 mb-4">
                    <div className="p-3 bg-white/90 rounded-xl border border-blue-200/80 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Agreement No:</span>
                        <span className="font-mono font-bold text-slate-900">{agreementData.agreement_number || 'AGR-SKT'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Allocated Cluster:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[150px]">{agreementData.cluster?.cluster_name || agreementData.territory_scope || 'Partner Region'}</span>
                      </div>
                      {agreementData.document_url && (
                        <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 text-blue-700 text-[11px] font-bold">
                          <FiFileText className="text-red-600 shrink-0" size={13} />
                          <span className="truncate">Admin Agreement PDF Attached</span>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-medium">
                      {isAgreementSigned
                        ? "Franchise partner agreement executed successfully. You can view or download the stamped copy anytime."
                        : "Review your tailored franchise distribution agreement and execute it digitally or upload a signed scan."}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-600 mb-5 leading-relaxed font-medium">
                    Review your tailored franchise distribution agreement and execute it digitally or upload a signed scan.
                  </p>
                )}
              </div>
              <button
                onClick={() => setAgreementModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-[#253880] hover:bg-[#1d2c66] text-white font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FiFileText size={16} />
                <span>{isAgreementSigned ? "View Agreement Copy" : "Review & Sign Agreement"}</span>
              </button>
            </div>

            {/* Action 2: Fee Payment & Receipt */}
            <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${isReceiptVerified
              ? "border-emerald-200 bg-emerald-50/50 shadow-xs"
              : isReceiptUploaded
                ? "border-sky-400 bg-sky-50/60 shadow-md ring-2 ring-sky-400/20"
                : isAgreementSigned
                  ? "border-amber-400 bg-amber-50/60 shadow-md ring-2 ring-amber-400/20"
                  : "border-slate-200 bg-slate-50 opacity-60"
              }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-base text-slate-900 flex items-center gap-2">
                    <FiCreditCard size={18} className="text-amber-700" /> Step 4 & 5: Fee Payment
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${isReceiptVerified ? "bg-emerald-100 text-emerald-800" : isReceiptUploaded ? "bg-sky-100 text-sky-900 border border-sky-300" : isAgreementSigned ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-slate-200 text-slate-600"
                    }`}>
                    {isReceiptVerified ? "✓ Fee Verified" : isReceiptUploaded ? "Under Review" : isAgreementSigned ? "Pending Upload" : "Locked"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Franchisee Setup Fee:</span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{(feeInfo?.setup_fee || feeInfo?.plan?.fee_amount || amountPaid || 100000).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {feeInfo?.renewal_fee && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-400 font-medium">Annual Renewal Fee:</span>
                        <span className="font-bold text-slate-700">₹{feeInfo.renewal_fee.toLocaleString('en-IN')}/cycle</span>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    {isReceiptVerified
                      ? "Franchise fee verified! Store setup workflow is now initialized."
                      : isReceiptUploaded
                        ? "Payment slip submitted. Admin is confirming your transaction."
                        : "Transfer the setup fee and upload your bank UTR number and transfer receipt slip for verification."}
                  </p>
                </div>
              </div>
              <button
                disabled={!isAgreementSigned}
                onClick={() => setPaymentModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FiUploadCloud size={16} />
                <span>{isReceiptUploaded ? "View / Update Receipt" : "Upload Payment Receipt"}</span>
              </button>
            </div>

            {/* Action 3: Physical Store Setup & Go-Live */}
            <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${isAccountActive
              ? "border-emerald-300 bg-emerald-50/60 shadow-xs"
              : isStoreSetupInProgress
                ? "border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20"
                : isStoreSetupCompleted
                  ? "border-emerald-300 bg-emerald-50/60 shadow-xs"
                  : "border-slate-200 bg-slate-50 opacity-60"
              }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-base text-slate-900 flex items-center gap-2">
                    <FaStore size={18} className="text-amber-600" /> Step 6 & 7: Store Setup & Launch
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${isAccountActive
                    ? "bg-emerald-100 text-emerald-800"
                    : isStoreSetupCompleted
                      ? "bg-emerald-100 text-emerald-800"
                      : isStoreSetupInProgress
                        ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                    {isAccountActive ? "✓ Active" : isStoreSetupCompleted ? "✓ Verified" : isStoreSetupInProgress ? "In Progress" : "Pending Steps"}
                  </span>
                </div>
                <p className="text-slate-600 mb-5 leading-relaxed font-medium">
                  {isAccountActive
                    ? "Admin verification confirmed. Your franchise partner retail privileges are 100% active."
                    : isStoreSetupInProgress
                      ? `Physical store execution in progress (${setup?.progress_percentage || 0}% completed). Assigned Coordinator: ${setup?.assigned_employee_name || 'State Coordinator'}.`
                      : "Complete agreement execution and fee payment confirmation to initialize store setup."}
                </p>
              </div>

              {isAccountActive ? (
                <Link
                  to="/dashboard"
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <FiShoppingBag size={16} />
                  <span>Enter Dashboard</span>
                </Link>
              ) : isReceiptVerified ? (
                <button
                  onClick={() => setStoreSetupModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaStore size={16} />
                  <span>View Store Setup Checklist →</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-2xl bg-slate-100 text-slate-500 font-bold text-center border border-slate-200">
                  🔒 Awaiting Payment Verification
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── MODAL 1: Digital Franchise Agreement Signing & Upload ─────────── */}
      <AnimatePresence>
        {agreementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl p-6 sm:p-9 text-slate-900 relative my-4 flex flex-col space-y-6"
            >
              <button
                onClick={() => setAgreementModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>

              {/* Official Agreement Header */}
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-[#253880] border border-blue-200">
                    Step 3 • Legal Agreement Execution
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Agreement No: <strong className="font-mono">{agreementData?.agreement_number || `SK-FRN-AGR-${new Date().getFullYear()}`}</strong>
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Version: v{agreementData?.version || "2.0"}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {agreementData?.title || "SolarKits Authorized Franchise Partner Agreement"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Official Commercial Contract between SolarKits Clean Energy Solutions Private Limited and Franchise Partner.
                </p>
              </div>

              {/* Parties & Commercial Overview Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Franchise Entity</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{companyName || reseller?.business_name || "Solar Enterprise"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Signatory Person</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{primaryName || reseller?.contact_person || signerName || "Authorized Partner"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">GSTIN</p>
                  <p className="font-mono font-bold text-[#253880] mt-0.5">{reseller?.gst_number || reseller?.gstin || "Pending / Inbound"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Territory Scope</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{agreementData?.territory_scope || reseller?.address?.city || reseller?.address?.state || "Assigned Territory"}</p>
                </div>
              </div>

              {/* Agreement Document Reader */}
              {agreementData?.document_url ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                        <FiFileText size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">
                            {agreementData.document_name || "Official_Franchisee_Agreement.pdf"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#253880] uppercase tracking-wider">
                            Admin Stamped PDF
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Uploaded by SolarKits Admin • Tailored legal contract with assigned cluster and fee terms
                        </p>
                      </div>
                    </div>

                    <a
                      href={getDocumentFullUrl(agreementData.document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors shrink-0"
                    >
                      <FiDownload size={14} />
                      <span>Download / Open PDF</span>
                      <FiExternalLink size={12} />
                    </a>
                  </div>

                  {/* Embedded PDF Viewer */}
                  <div className="rounded-2xl border border-slate-300 overflow-hidden bg-slate-900/5 shadow-inner">
                    <iframe
                      src={`${getDocumentFullUrl(agreementData.document_url)}#toolbar=1`}
                      title="Franchisee Agreement Document"
                      className="w-full h-96 sm:h-[480px] rounded-2xl border-0 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FiFileText className="text-[#253880]" size={14} />
                      <span>Official Agreement Terms & Legal Clauses (Scroll to read complete document)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Standard Legal Text</span>
                  </div>

                  <div className="h-80 sm:h-96 overflow-y-auto p-6 sm:p-8 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs sm:text-sm text-slate-800 space-y-4 font-sans leading-relaxed shadow-inner whitespace-pre-wrap selection:bg-blue-100">
                    {agreementData?.agreement_content || (
                      <div className="space-y-3">
                        <p className="font-bold text-slate-900 text-base border-b pb-2">
                          TERMS OF FRANCHISE APPOINTMENT & DISTRIBUTION RIGHTS
                        </p>
                        <p>
                          <strong>1. APPOINTMENT:</strong> SolarKits Clean Energy Solutions Private Limited authorizes <strong>{companyName}</strong> as an authorized regional partner for combo kit distribution and EPC contractor allocation.
                        </p>
                        <p>
                          <strong>2. TERRITORY:</strong> Operations are granted within assigned territory: <strong>{reseller?.address?.city || reseller?.address?.state || "Assigned District"}</strong>.
                        </p>
                        <p>
                          <strong>3. STORE SETUP:</strong> The partner agrees to execute physical retail branding and display standards as specified by SolarKits within the allowed setup SLA.
                        </p>
                        <p>
                          <strong>4. COMMERCIAL TERMS & CONFIDENTIALITY:</strong> Minimum order quantities, price lists, and margin schedules shall apply as per active franchise plan.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signing Controls */}
              {!isAgreementSigned ? (
                <form onSubmit={handleSignAgreement} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-black text-slate-900">Execution Signatory Details</h4>

                  {agreementError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                      <FiAlertCircle size={16} />
                      <span>{agreementError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Legal Signatory Full Name *</label>
                      <input
                        type="text"
                        required
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#253880]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Signatory Legal Title / Designation *</label>
                      <input
                        type="text"
                        required
                        value={signerDesignation}
                        onChange={(e) => setSignerDesignation(e.target.value)}
                        placeholder="e.g. Proprietor / Managing Director"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#253880]"
                      />
                    </div>
                  </div>



                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="agreementConsent"
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#253880] focus:ring-[#253880]"
                    />
                    <label htmlFor="agreementConsent" className="text-xs text-slate-700 font-medium cursor-pointer">
                      I confirm that I am authorized to execute this agreement on behalf of <strong>{companyName}</strong>, and I agree to all clauses and terms.
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setAgreementModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={signingLoading}
                      className="px-6 py-2.5 rounded-xl bg-[#253880] hover:bg-[#1d2c66] text-white font-black text-xs shadow-md flex items-center gap-2"
                    >
                      {signingLoading ? (
                        <>
                          <FiLoader className="animate-spin" size={16} />
                          <span>Signing Document...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck size={16} />
                          <span>Execute & Sign Agreement</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle size={20} className="text-emerald-600" />
                    <div>
                      <p className="font-black">Agreement Successfully Signed & Executed</p>
                      <p className="text-emerald-700">Signatory: {reseller?.agreement_signer_name || primaryName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAgreementModalOpen(false)}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: Fee Payment & Receipt Upload ─────────────────────────── */}
      <AnimatePresence>
        {paymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[94vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-slate-900 relative my-4 space-y-5"
            >
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>

              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Step 4 • Fee Payment Submission
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Franchise Onboarding Fee Receipt
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit bank transfer details and payment receipt for admin verification.
                </p>
              </div>

              {/* Fee Breakdown Configured by Admin */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900 uppercase tracking-wider">
                    {feeInfo?.plan?.name || "Franchisee Partner Plan"}
                  </span>
                  {feeInfo?.agreement_number && (
                    <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-amber-200">
                      {feeInfo.agreement_number}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-amber-200/60 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-semibold block">Franchisee Setup Fee</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">
                      ₹{(feeInfo?.setup_fee || feeInfo?.plan?.fee_amount || 100000).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">One-time Payable</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-semibold block">Annual Renewal Fee</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">
                      ₹{(feeInfo?.renewal_fee || 10000).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Per renewal cycle</span>
                  </div>
                </div>

                {feeInfo?.cluster?.cluster_name && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                    <FiMapPin className="text-amber-700 shrink-0" size={13} />
                    <span>Allocated Cluster: <strong>{feeInfo.cluster.cluster_name}</strong> {feeInfo.cluster.cluster_code ? `(${feeInfo.cluster.cluster_code})` : ''}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Company Bank Account Details for Offline Fee Transfer */}
              {feeInfo?.company_bank_details?.account_number ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <FiCreditCard className="text-amber-700" size={15} /> Company Bank Account Details (Offline Transfer)
                    </span>
                    <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
                      Verified Escrow Account
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Transfer the franchise setup fee to the company bank account below via NEFT / RTGS / IMPS before submitting your transaction receipt:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Account Holder Name */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">
                        Account Holder Name
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block truncate" title={feeInfo.company_bank_details.account_holder_name}>
                        {feeInfo.company_bank_details.account_holder_name || "—"}
                      </span>
                    </div>

                    {/* Account Number */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">
                          Account Number
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(feeInfo.company_bank_details.account_number, "modal_acc_no")}
                          className="text-amber-700 hover:text-amber-900 text-[10px] flex items-center gap-1 font-bold cursor-pointer transition"
                          title="Copy Account Number"
                        >
                          {copiedField === "modal_acc_no" ? <FiCheck size={11} className="text-emerald-600" /> : <FiCopy size={11} />}
                          <span>{copiedField === "modal_acc_no" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block select-all tracking-wider">
                        {feeInfo.company_bank_details.account_number || "—"}
                      </span>
                    </div>

                    {/* IFSC Code */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">
                          IFSC Code
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(feeInfo.company_bank_details.ifsc_code, "modal_ifsc")}
                          className="text-amber-700 hover:text-amber-900 text-[10px] flex items-center gap-1 font-bold cursor-pointer transition"
                          title="Copy IFSC Code"
                        >
                          {copiedField === "modal_ifsc" ? <FiCheck size={11} className="text-emerald-600" /> : <FiCopy size={11} />}
                          <span>{copiedField === "modal_ifsc" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block select-all uppercase tracking-wider">
                        {feeInfo.company_bank_details.ifsc_code || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleUploadReceipt} className="space-y-4 text-xs">
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
                    <FiAlertCircle size={16} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank UTR / Transaction ID *</label>
                    <input
                      type="text"
                      required
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. UTR1234567890"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 uppercase font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Amount Paid (₹) *</span>
                      <span className="text-[10px] text-amber-800 font-bold inline-flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        <FiLock size={11} /> Locked
                      </span>
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={amountPaid}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 font-bold cursor-not-allowed select-none focus:outline-none"
                      title="Amount is fixed and locked to the official Franchisee Setup Fee configured by Admin"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sender Bank Name</label>
                    <input
                      type="text"
                      value={senderBank}
                      onChange={(e) => setSenderBank(e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Receipt / Bank Slip (Image or PDF)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md flex items-center gap-2"
                  >
                    {uploadLoading ? (
                      <>
                        <FiLoader className="animate-spin" size={16} />
                        <span>Submitting Slip...</span>
                      </>
                    ) : (
                      <>
                        <FiUploadCloud size={16} />
                        <span>Submit Payment Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: Physical Store Setup & Inspection Tracker (NEW) ───────── */}
      <AnimatePresence>
        {storeSetupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-slate-900 relative my-4 space-y-6"
            >
              <button
                onClick={() => setStoreSetupModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>

              {/* Store Setup Header */}
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Step 6 • Physical Store Setup & Verification
                  </span>
                  {setup?.store_setup_id && (
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      ID: {setup.store_setup_id}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${isStoreSetupCompleted
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}>
                    {isStoreSetupCompleted ? "✓ ADMIN VERIFIED" : `IN PROGRESS (${setup?.progress_percentage || 0}%)`}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Franchise Store Execution & Inspection Tracker
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {checklist.length}-step physical showroom setup, branding display, inverter setup, and regional state coordinator inspection.
                </p>
              </div>

              {/* State Employee & Timeline Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Assigned State Coordinator</span>
                  <strong className="text-slate-900 text-sm block mt-0.5">
                    {setup?.assigned_employee_name || "Regional Coordinator Assigned"}
                  </strong>
                  <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 mt-0.5">
                    {setup?.assigned_employee_email && <span>{setup.assigned_employee_email}</span>}
                    {setup?.assigned_employee_phone && <span className="font-semibold text-slate-700">Ph: {setup.assigned_employee_phone}</span>}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Target Completion Date</span>
                  <strong className="text-slate-900 text-sm block mt-0.5">
                    {setup?.revised_completion_date
                      ? new Date(setup.revised_completion_date).toLocaleDateString()
                      : setup?.original_completion_date
                        ? new Date(setup.original_completion_date).toLocaleDateString()
                        : "Within 21 Days"}
                  </strong>
                  <span className="text-[11px] text-slate-500">Allowed SLA: {setup?.allowed_setup_days || 21} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Checklist Progress</span>
                  <strong className="text-amber-700 text-sm block mt-0.5">
                    {setup?.completed_activities || 0} of {setup?.total_activities || checklist.length} Steps Completed
                  </strong>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${setup?.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Checklist View */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Physical Store Setup Checklist Items ({checklist.length})</span>
                  <span className="text-slate-500 font-medium text-[11px]">Assisted by State Coordinator</span>
                </h4>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {checklist.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                      Store setup checklist template is initialized automatically upon fee payment confirmation.
                    </div>
                  ) : (
                    checklist.map((item, idx) => (
                      <div
                        key={item._id || idx}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              #{item.display_order || idx + 1}. {item.title}
                            </span>
                            {item.is_mandatory && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Mandatory
                              </span>
                            )}
                            {item.proof_required && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                Proof Required
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px]">{item.description}</p>
                        </div>

                        <div className="shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${item.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : item.status === "in_progress"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                            {item.status ? item.status.toUpperCase() : "PENDING"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setStoreSetupModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Close Tracker
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
