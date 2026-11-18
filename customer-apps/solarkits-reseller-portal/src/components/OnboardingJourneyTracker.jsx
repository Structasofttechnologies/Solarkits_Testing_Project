import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiShield,
  FiFileText,
  FiCreditCard,
  FiUploadCloud,
  FiDollarSign,
  FiPackage,
  FiUsers,
  FiMapPin,
  FiArrowRight,
  FiCheck,
  FiX,
  FiLoader,
  FiCopy,
  FiExternalLink,
  FiLock,
  FiShoppingBag,
} from "react-icons/fi";
import api from "../services/api";

export default function OnboardingJourneyTracker({ reseller, onRefresh }) {
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Agreement State
  const [agreementData, setAgreementData] = useState(null);
  const [signerName, setSignerName] = useState(reseller?.contact_person || reseller?.business_name || "");
  const [signerDesignation, setSignerDesignation] = useState("Authorized Signatory / Proprietor");
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [agreementError, setAgreementError] = useState("");

  // Payment Info & Receipt Upload State
  const [feeInfo, setFeeInfo] = useState(null);
  const [utrNumber, setUtrNumber] = useState(reseller?.fee_payment_utr || "");
  const [amountPaid, setAmountPaid] = useState(reseller?.fee_payment_amount || 50000);
  const [senderBank, setSenderBank] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [copiedField, setCopiedField] = useState("");

  // Load current agreement & fee details on open
  useEffect(() => {
    if (agreementModalOpen) {
      loadAgreement();
    }
  }, [agreementModalOpen]);

  useEffect(() => {
    if (paymentModalOpen) {
      loadFeeInfo();
    }
  }, [paymentModalOpen]);

  const loadAgreement = async () => {
    try {
      const res = await api.get("/india/v1/reseller/agreement/current");
      if (res.data?.status === "success") {
        setAgreementData(res.data.data?.agreement);
      }
    } catch (err) {
      console.warn("Failed to load agreement details:", err);
    }
  };

  const loadFeeInfo = async () => {
    try {
      const res = await api.get("/india/v1/reseller/fee-payment/info");
      if (res.data?.status === "success") {
        setFeeInfo(res.data.data);
        if (res.data.data?.plan?.fee_amount) {
          setAmountPaid(res.data.data.plan.fee_amount);
        }
      }
    } catch (err) {
      console.warn("Failed to load fee info:", err);
    }
  };

  const [agreementFile, setAgreementFile] = useState(null);

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
        if (onRefresh) onRefresh();
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
        if (onRefresh) onRefresh();
      } else {
        setUploadError(res.data?.message || "Failed to upload payment receipt.");
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || "Receipt upload failed. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  };

  // State flags for steps
  const isGstVerified = Boolean(reseller?.gst_number || reseller?.gst_verified_at);
  const isApproved = reseller?.activation_status !== "rejected" && reseller?.activation_status !== "draft";
  const isAgreementSigned = reseller?.agreement_status === "signed";
  const isReceiptUploaded = reseller?.fee_payment_status === "receipt_uploaded" || reseller?.fee_payment_status === "verified";
  const isReceiptVerified = reseller?.fee_payment_status === "verified";
  const isAccountActive = reseller?.activation_status === "active";

  const steps = [
    {
      num: 1,
      title: "Lead & GST Verification",
      subtitle: isGstVerified ? "QuickeKYC Authenticated" : "GSTIN Linked",
      status: "completed",
      statusText: "Verified",
      icon: FiShield,
      activeColor: "border-emerald-500 bg-emerald-50 text-emerald-700",
    },
    {
      num: 2,
      title: "Admin Review & Approval",
      subtitle: "Eligibility Confirmed",
      status: "completed",
      statusText: "Approved",
      icon: FiCheckCircle,
      activeColor: "border-emerald-500 bg-emerald-50 text-emerald-700",
    },
    {
      num: 3,
      title: "Agreement Signing",
      subtitle: isAgreementSigned ? `Signed by ${reseller?.agreement_signer_name || "Partner"}` : "Digital Legal Agreement",
      status: isAgreementSigned ? "completed" : "current",
      statusText: isAgreementSigned ? "Digitally Signed" : "Action Required",
      icon: FiFileText,
      activeColor: isAgreementSigned
        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
        : "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-400/40",
      buttonText: isAgreementSigned ? "View Agreement" : "Review & Sign Agreement",
      onClick: () => setAgreementModalOpen(true),
    },
    {
      num: 4,
      title: "Offline Fee Payment",
      subtitle: isReceiptUploaded ? `UTR: ${reseller?.fee_payment_utr || "Recorded"}` : "Bank Account Transfer",
      status: isReceiptUploaded ? "completed" : isAgreementSigned ? "current" : "locked",
      statusText: isReceiptUploaded ? "Transferred" : isAgreementSigned ? "Payment Pending" : "Locked",
      icon: FiCreditCard,
      activeColor: isReceiptUploaded
        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
        : isAgreementSigned
        ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-400/40"
        : "border-slate-200 bg-slate-50 text-slate-400",
      buttonText: isReceiptUploaded ? "View Bank Details" : "View Bank Details & Pay",
      onClick: isAgreementSigned ? () => setPaymentModalOpen(true) : null,
    },
    {
      num: 5,
      title: "Receipt Verification",
      subtitle: isReceiptVerified ? "Confirmed by Admin" : isReceiptUploaded ? "Under Admin Review" : "Upload Slip",
      status: isReceiptVerified ? "completed" : isReceiptUploaded ? "pending" : "locked",
      statusText: isReceiptVerified ? "Verified" : isReceiptUploaded ? "Reviewing Receipt" : "Locked",
      icon: FiUploadCloud,
      activeColor: isReceiptVerified
        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
        : isReceiptUploaded
        ? "border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-400/40"
        : "border-slate-200 bg-slate-50 text-slate-400",
      buttonText: isReceiptUploaded ? "Upload Update / Slip" : "Upload Receipt",
      onClick: isAgreementSigned ? () => setPaymentModalOpen(true) : null,
    },
    {
      num: 6,
      title: "Operations Start",
      subtitle: isAccountActive ? "Wholesale Orders Active" : "Full Access Pending",
      status: isAccountActive ? "completed" : "locked",
      statusText: isAccountActive ? "100% Active" : "Locked",
      icon: FiShoppingBag,
      activeColor: isAccountActive
        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
        : "border-slate-200 bg-slate-50 text-slate-400",
      link: isAccountActive ? "/po-order" : null,
      linkText: "Place Franchise PO Order",
    },
  ];

  const completedStepsCount = [isGstVerified, isApproved, isAgreementSigned, isReceiptUploaded, isReceiptVerified, isAccountActive].filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 6) * 100);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden mb-8">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#253880]/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#F49222]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F49222] text-white">
                Official Franchise Journey
              </span>
              <span className="text-xs text-blue-300 font-semibold">
                Partner Onboarding & Activation Pipeline
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Welcome, {reseller?.contact_person || reseller?.business_name || "Franchise Partner"}</span>
              {isAccountActive && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  ✓ Active Partner
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300">
              {isAccountActive
                ? "Your franchise partner account is fully activated. You have complete access to wholesale ordering, EPC management, and catalog pricing."
                : !isAgreementSigned
                ? "Step 3 Required: Please review and digitally sign your SolarKits Franchise Agreement to proceed with fee payment."
                : !isReceiptUploaded
                ? "Step 4 & 5 Required: Transfer the one-time franchise fee to our official bank account and upload your payment slip/UTR."
                : "Step 5 Pending: Your payment receipt has been submitted and is currently being verified by the SolarKits admin team."}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="shrink-0 flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
            <div className="text-right">
              <div className="text-xs text-slate-300 font-medium">Onboarding Progress</div>
              <div className="text-lg font-black text-white">{progressPercent}%</div>
            </div>
            <div className="w-16 h-16 relative flex items-center justify-center">
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
              <span className="absolute text-xs font-bold text-white">{completedStepsCount}/6</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Step Visual Pipeline Cards */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 bg-slate-50/50">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className={`relative rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 ${step.activeColor} shadow-xs`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-white shadow-xs border border-slate-200 shrink-0">
                    {step.num}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 border border-current whitespace-nowrap leading-none shrink-0 inline-flex items-center gap-1">
                    {step.statusText === "Action Required" && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />}
                    {step.statusText}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1.5 font-black text-xs text-slate-900">
                  <Icon size={16} className="shrink-0" />
                  <span>{step.title}</span>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug mb-3">
                  {step.subtitle}
                </p>
              </div>

              {/* Step Actions */}
              <div>
                {step.buttonText && step.onClick && (
                  <button
                    onClick={step.onClick}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-[#253880] hover:bg-[#1d2c66] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  >
                    <span>{step.buttonText}</span>
                    <FiArrowRight size={12} />
                  </button>
                )}

                {step.link && (
                  <Link
                    to={step.link}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  >
                    <span>{step.linkText}</span>
                    <FiArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL 1: Digital Franchise Agreement Signing ───────────────────── */}
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
                    Agreement No: <strong className="font-mono">{agreementData?.agreement_number || "SK-FRN-AGR-2026"}</strong>
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
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{reseller?.business_name || "Solar Enterprise"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Signatory Person</p>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{reseller?.contact_person || signerName || "Authorized Partner"}</p>
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

              {/* Large-Format Agreement Text Reader (High Readability) */}
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
                        SOLARKITS AUTHORIZED FRANCHISE PARTNER AGREEMENT
                      </p>
                      <p>
                        <strong>1. APPOINTMENT & EXCLUSIVITY:</strong> SolarKits Clean Energy Solutions Private Limited ("Company") hereby authorizes <strong>{reseller?.business_name}</strong> ("Franchise Partner") as an authorized regional partner for distribution, combo kit marketing, and EPC contractor allocation.
                      </p>
                      <p>
                        <strong>2. TERRITORY RIGHTS:</strong> Franchise Partner is granted commercial operation rights in the assigned geographical territory: <strong>{reseller?.address?.city || reseller?.address?.state || "Assigned District"}</strong>. Company guarantees protected pricing and EPC contractor alignment within this boundary.
                      </p>
                      <p>
                        <strong>3. WHOLESALE PRICING & MARGINS:</strong> The Franchisee receives factory-direct distributor margins on SolarKits Combo Kits, inverters, structure packages, and BOS components.
                      </p>
                      <p>
                        <strong>4. MANUAL FEE PAYMENT TERMS:</strong> The franchise enrollment requires a one-time manual fee settlement. Account activation is finalized immediately upon administrative confirmation of the uploaded bank payment receipt.
                      </p>
                      <p>
                        <strong>5. TERM & RENEWAL:</strong> This Agreement shall remain in force for a period of 12 months from the date of activation and shall be automatically renewable subject to performance targets.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution / Signatory Section */}
              {isAgreementSigned ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2.5 font-black text-base sm:text-lg">
                    <FiCheckCircle className="text-emerald-600 shrink-0" size={24} />
                    <span>Franchise Partner Agreement Digitally Executed & Verified</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <p>Legal Signatory: <strong>{reseller?.agreement_signer_name || signerName}</strong></p>
                    <p>Signatory Title: <strong>{reseller?.signer_designation || signerDesignation}</strong></p>
                    <p>Timestamp: <strong>{new Date(reseller?.agreement_signed_at || Date.now()).toLocaleString()}</strong></p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignAgreement} className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                        Full Legal Signatory Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="e.g. Ramesh Chandra"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                        Signatory Designation <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={signerDesignation}
                        onChange={(e) => setSignerDesignation(e.target.value)}
                        placeholder="e.g. Proprietor / Managing Director / Authorized Partner"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                      Upload Signed Agreement Document (Optional PDF / Image Scan)
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 cursor-pointer select-none p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <input
                      type="checkbox"
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded text-[#253880] focus:ring-0 cursor-pointer"
                    />
                    <span>
                      I solemnly declare that I am the authorized legal representative of <strong>{reseller?.business_name}</strong>. I have read, understood, and hereby accept and digitally execute this Franchise Partner Agreement.
                    </span>
                  </label>

                  {agreementError && (
                    <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{agreementError}</p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setAgreementModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer transition"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={signingLoading}
                      className="px-7 py-3 rounded-xl bg-[#253880] hover:bg-[#1d2c66] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition"
                    >
                      {signingLoading ? <FiLoader className="animate-spin" /> : <FiCheck size={18} />}
                      <span>Digitally Sign & Proceed to Fee Payment</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: Offline Manual Fee Payment & Receipt Upload ──────────── */}
      <AnimatePresence>
        {paymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-slate-900 relative my-6"
            >
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>

              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    Step 4 & 5 • Offline Manual Fee Payment
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    Franchise Fee Payment & Receipt Verification
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Submit your transaction reference number (UTR) & payment receipt slip below.
                  </p>
                </div>

                {/* Dynamic Company Bank Details (Configured by Admin) */}
                {feeInfo?.company_bank_details?.account_number ? (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                      <div className="flex items-center gap-2">
                        <FiCreditCard className="text-amber-700" size={16} />
                        <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                          Official Company Bank Account Details
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
                        NEFT / RTGS / IMPS
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Transfer exact setup fee of <strong>₹{Number(amountPaid).toLocaleString("en-IN")}</strong> to our verified company account below:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Account Holder Name */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">
                          Account Holder Name
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block truncate" title={feeInfo.company_bank_details.account_holder_name}>
                          {feeInfo.company_bank_details.account_holder_name || "—"}
                        </span>
                      </div>

                      {/* Account Number */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">
                            Account Number
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(feeInfo.company_bank_details.account_number, "tracker_acc")}
                            className="text-amber-700 hover:text-amber-900 text-[10px] flex items-center gap-1 font-bold cursor-pointer"
                            title="Copy Account Number"
                          >
                            {copiedField === "tracker_acc" ? <FiCheck size={11} className="text-emerald-600" /> : <FiCopy size={11} />}
                            <span>{copiedField === "tracker_acc" ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block select-all tracking-wider">
                          {feeInfo.company_bank_details.account_number || "—"}
                        </span>
                      </div>

                      {/* IFSC Code */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">
                            IFSC Code
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(feeInfo.company_bank_details.ifsc_code, "tracker_ifsc")}
                            className="text-amber-700 hover:text-amber-900 text-[10px] flex items-center gap-1 font-bold cursor-pointer"
                            title="Copy IFSC Code"
                          >
                            {copiedField === "tracker_ifsc" ? <FiCheck size={11} className="text-emerald-600" /> : <FiCopy size={11} />}
                            <span>{copiedField === "tracker_ifsc" ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block select-all uppercase tracking-wider">
                          {feeInfo.company_bank_details.ifsc_code || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white space-y-3 shadow-md border border-amber-500/30">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-black uppercase text-[#F49222]">
                          Verbal Account Manager Payment Consultation
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-400/30">
                        Company Policy
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-200 leading-relaxed">
                      <p className="font-medium">
                        <strong>Important Security Policy:</strong> All payment details and offline bank transfer options are communicated directly through verbal discussion with your assigned Account Manager.
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm text-slate-300">
                      <span>Enrollment Fee Reference:</span>
                      <span className="font-black text-amber-400 text-base">₹{Number(amountPaid).toLocaleString("en-IN")} (+ GST as applicable)</span>
                    </div>
                  </div>
                )}

                {/* Receipt Upload & UTR Submission Form */}
                <form onSubmit={handleUploadReceipt} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1.5">
                        Bank UTR / Transaction Reference No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC260812345678"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1.5">
                        Amount Paid (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="50000"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1.5">
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1.5">
                        Remitter / Sender Bank Name
                      </label>
                      <input
                        type="text"
                        value={senderBank}
                        onChange={(e) => setSenderBank(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1.5">
                      Upload Bank Payment Receipt Slip / PDF
                    </label>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-1.5 text-slate-600">
                        <FiUploadCloud size={24} className="text-[#253880]" />
                        <span className="text-sm font-bold text-slate-800">
                          {receiptFile ? receiptFile.name : "Click to select or drop transfer receipt slip"}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Supports JPG, PNG, WEBP, PDF (Max 10MB)</span>
                      </div>
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-sm font-bold text-red-600">{uploadError}</p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      {uploadLoading ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={18} />}
                      <span>Submit Payment Receipt for Admin Verification</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
