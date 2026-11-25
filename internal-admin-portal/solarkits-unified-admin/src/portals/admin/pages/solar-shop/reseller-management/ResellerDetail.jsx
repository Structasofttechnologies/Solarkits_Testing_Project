import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiArrowLeft,
  FiUser,
  FiFileText,
  FiShield,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiLoader,
  FiExternalLink,
  FiMapPin,
  FiMail,
  FiPhone,
  FiZap,
  FiEye,
  FiX,
  FiBriefcase,
  FiCreditCard,
  FiTag,
  FiCheck,
  FiPlus,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_MGMT";
const KYC_UID = "RSL_KYC";

const DOC_TYPES = [
  { key: "pan_card",         name: "PAN Card",            required: true },
  { key: "shop_photo",       name: "Shop / Business Photo", required: true },
  { key: "gst_certificate",  name: "GST Certificate",     required: false },
  { key: "aadhaar_front",    name: "Aadhaar (Front)",     required: false },
  { key: "aadhaar_back",     name: "Aadhaar (Back)",      required: false },
  { key: "address_proof",    name: "Address Proof",       required: false },
  { key: "cancelled_cheque", name: "Cancelled Cheque",    required: false },
];

const SOURCE_BADGES = {
  admin_override: { label: "Admin Override", bg: "bg-danger-soft text-danger", icon: FiShield },
  admin_assigned: { label: "Admin Assigned", bg: "bg-info-soft text-primary", icon: FiUser },
  plan:           { label: "Plan Default",   bg: "bg-success-soft text-success", icon: FiCheck },
  gst_derived:    { label: "GST Address",    bg: "bg-warning-soft text-warning", icon: FiMapPin },
};

function SourceBadge({ source }) {
  const cfg = SOURCE_BADGES[source] || SOURCE_BADGES.admin_assigned;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} border border-current/20`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

const getDocUrl = (storageKey) => {
  if (!storageKey) return "";
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  // If it's a Cloudinary public_id or wrapped in uploads path
  if (storageKey.includes("solarkits/solarkits-admin-panel-backend/")) {
    const publicId = storageKey.replace(/^\/?(?:uploads\/kyc\/)+/, "").replace(/^\/+/, "");
    return `https://res.cloudinary.com/dggmbagax/image/upload/${publicId}`;
  }
  const cleanPath = storageKey.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^public\//, "");
  const serverBase = (API_BASE || "").replace(/\/admin-api$|\/api$/, "");
  return `${serverBase}/${cleanPath.startsWith("uploads/") ? cleanPath : "uploads/" + cleanPath}`;
};

function KycReviewModal({ decision, resellerName, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isVerify = decision === "verify";
  const title = isVerify ? "Verify KYC Documents?" : decision === "reject" ? "Reject KYC Documents?" : "Request Resubmission?";

  const handleConfirm = async () => {
    if (!isVerify && !note.trim()) return;
    setSubmitting(true);
    await onConfirm(decision, note.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted">Target Franchisee: <strong className="text-text-primary">{resellerName}</strong></p>

        {!isVerify && (
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Reason / Note <span className="text-danger">*</span></label>
            <textarea
              rows={3}
              required
              placeholder={decision === "reject" ? "e.g. Invalid PAN Card details" : "e.g. Re-upload clear photo of shop premises"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover">Cancel</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || (!isVerify && !note.trim())}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              isVerify ? "bg-success hover:bg-success-hover" : "bg-danger hover:bg-danger-hover"
            }`}
          >
            {submitting ? <FiLoader className="animate-spin" size={14} /> : null}
            {isVerify ? "Approve KYC" : "Submit Decision"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DocViewerModal({ docName, docUrl, onClose }) {
  const isPdf = docUrl?.toLowerCase().endsWith(".pdf");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <FiShield className="text-primary" /> {docName}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover flex items-center gap-1 shadow-sm"
            >
              <FiExternalLink size={14} /> Open Full Size
            </a>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors cursor-pointer">
              <FiX size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-bg">
          {isPdf ? (
            <iframe src={docUrl} title={docName} className="w-full h-[600px] rounded-xl border border-border" />
          ) : (
            <img src={docUrl} alt={docName} className="max-h-[600px] max-w-full rounded-xl object-contain shadow-md" />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResellerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [reseller, setReseller] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kyc");

  const [kycModal, setKycModal] = useState(null); // 'verify' | 'reject' | 'resubmit'
  const [viewDoc, setViewDoc] = useState(null); // { name, url }

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/reseller-mgmt/detail/${id}?req_for=view&unique_id=${MODULE_UID}`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setReseller(res.data.data.reseller);
        setKyc(res.data.data.kyc);
        setActiveSub(res.data.data.active_subscription);
        setAuditHistory(res.data.data.audit_history || []);
        if (res.data.data.territories) {
          setTerritories(res.data.data.territories);
        }
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load reseller details" }));
    } finally {
      setLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleKycReview = async (decision, note) => {
    try {
      const res = await axios.put(
        `${API_BASE}/reseller-mgmt/kyc/review/${id}?req_for=edit&unique_id=${KYC_UID}`,
        { decision, note },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `KYC status updated: ${decision}` }));
        fetchDetail();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "KYC review failed" }));
    }
  };

  const handleActivationChange = async (status) => {
    try {
      const res = await axios.put(
        `${API_BASE}/reseller-mgmt/activation-status/${id}?req_for=edit&unique_id=${MODULE_UID}`,
        { activation_status: status, reason: `Account set to ${status} by Admin` },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `Reseller status set to ${status}` }));
        fetchDetail();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Status change failed" }));
    }
  };

  // ── Fee Payment Receipt Verification Handler ─────────────────────────────
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const handleVerifyFeePayment = async (decision) => {
    setVerifyingPayment(true);
    try {
      const res = await axios.put(
        `${API_BASE}/resellers/${id}/fee-payment/verify?req_for=edit&unique_id=${MODULE_UID}`,
        { decision, remarks: paymentRemarks.trim() },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success" || res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: res.data?.message || `Fee payment receipt ${decision}ed successfully!`,
          })
        );
        fetchDetail();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to update receipt." }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Receipt verification failed." }));
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-hover" />
            <div className="space-y-2">
              <div className="w-48 h-6 rounded-lg bg-surface-hover" />
              <div className="w-24 h-4 rounded-md bg-surface-hover" />
            </div>
          </div>
          <div className="w-32 h-10 rounded-xl bg-surface-hover" />
        </div>
        <div className="flex gap-2 border-b border-border pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-32 h-10 rounded-t-xl bg-surface-hover" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-surface-hover border border-border" />
      </div>
    );
  }

  if (!reseller) {
    return (
      <div className="text-center py-20 text-text-muted font-semibold">Franchisee account not found</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-hover text-text-muted transition-colors cursor-pointer">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{reseller.business_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-info-soft text-primary uppercase border border-primary/20">
                {reseller.commercial_mode} Mode
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                reseller.store_category === "company_store"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200"
              }`}>
                {reseller.store_category === "company_store" ? "Company Store" : "Franchisee Store"}
              </span>
              {reseller.reseller_lifecycle_status && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200">
                  {reseller.reseller_lifecycle_status}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-mono">Partner ID: {reseller.id}</p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          {reseller.activation_status === "active" ? (
            <button
              onClick={() => handleActivationChange("suspended")}
              className="px-4 py-2 rounded-xl bg-danger-soft text-danger border border-danger/20 text-xs font-bold hover:bg-danger hover:text-white transition-all shadow-xs cursor-pointer"
            >
              Suspend Franchisee
            </button>
          ) : (
            <button
              onClick={() => handleActivationChange("active")}
              disabled={reseller.kyc_status !== "verified"}
              title={reseller.kyc_status !== "verified" ? "Verify KYC first to activate account" : ""}
              className="px-4 py-2 rounded-xl bg-success text-white text-xs font-bold hover:bg-success-hover transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              Activate Franchisee Partner
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {[
          { id: "kyc",          label: "KYC Documents",          icon: FiShield },
          { id: "payment",      label: "Fee Payment & Receipt",  icon: FiCreditCard },
          { id: "profile",      label: "Business & Agreement",   icon: FiUser },
          { id: "subscription", label: "Plan & Territory",       icon: FiFileText },
          { id: "audit",        label: "Audit Trail",            icon: FiClock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active ? "border-primary text-primary bg-info-soft/40 rounded-t-xl" : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>


      {/* Tab Content Container */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        {/* ════════════════════════════════════════════
            1. KYC DOCUMENTS TAB
        ════════════════════════════════════════════ */}
        {activeTab === "kyc" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <FiShield className="text-primary" /> KYC Document Verification
                </h3>
                <p className="text-xs text-text-muted mt-0.5">Review uploaded business identity documents before approval</p>
              </div>

              {/* Review Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setKycModal("resubmit")}
                  className="px-3.5 py-2 rounded-xl border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover transition-all cursor-pointer"
                >
                  Request Resubmit
                </button>
                <button
                  onClick={() => setKycModal("reject")}
                  className="px-3.5 py-2 rounded-xl bg-danger-soft text-danger border border-danger/20 text-xs font-semibold hover:bg-danger hover:text-white transition-all cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => setKycModal("verify")}
                  className="px-4 py-2 rounded-xl bg-success text-white text-xs font-bold hover:bg-success-hover transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <FiCheckCircle size={14} />
                  Verify & Approve
                </button>
              </div>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DOC_TYPES.map((docDef) => {
                const uploaded = kyc?.docs?.[docDef.key];
                return (
                  <div key={docDef.key} className="p-4 rounded-xl border border-border bg-bg space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-text-primary">{docDef.name}</p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {docDef.required ? <span className="text-danger font-bold">Mandatory</span> : "Optional"}
                          </p>
                        </div>
                        {uploaded ? (
                          <span className="text-success text-xs font-bold flex items-center gap-1 bg-success-soft px-2 py-0.5 rounded-full border border-success/20">
                            <FiCheckCircle size={11} /> Uploaded
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs font-medium bg-surface px-2 py-0.5 rounded-full border border-border">
                            Not Uploaded
                          </span>
                        )}
                      </div>

                      {uploaded && (() => {
                        const fileUrl = getDocUrl(uploaded.storage_key);
                        const isImage = !uploaded.storage_key?.toLowerCase().endsWith(".pdf") && !uploaded.original_name?.toLowerCase().endsWith(".pdf");
                        return (
                          <div className="space-y-2.5 pt-1">
                            {isImage && (
                              <div
                                onClick={() => setViewDoc({ name: docDef.name, url: fileUrl })}
                                className="h-32 rounded-lg overflow-hidden border border-border bg-surface flex items-center justify-center cursor-pointer group relative shadow-xs"
                              >
                                <img src={fileUrl} alt={docDef.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1">
                                  <FiEye size={16} /> Click to Preview
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-text-secondary space-y-2 bg-surface p-2.5 rounded-lg border border-border">
                              <p className="truncate font-mono text-[11px] font-bold">{uploaded.original_name}</p>
                              <p className="text-[10px] text-text-muted">
                                {(uploaded.size_bytes / 1024).toFixed(1)} KB • {new Date(uploaded.uploaded_at).toLocaleDateString()}
                              </p>

                              <div className="flex items-center gap-2 pt-1.5 border-t border-border">
                                <button
                                  type="button"
                                  onClick={() => setViewDoc({ name: docDef.name, url: fileUrl })}
                                  style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                                  className="flex-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <FiEye size={14} /> View 👁️
                                </button>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 border border-slate-300"
                                >
                                  <FiExternalLink size={13} /> Open
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            2. FEE PAYMENT & RECEIPT TAB
        ════════════════════════════════════════════ */}
        {activeTab === "payment" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <FiCreditCard className="text-primary" /> Offline Franchise Fee Payment & Receipt Verification
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Verify manual bank transfer receipt slip & UTR before activating partner's exclusive commercial rights
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  reseller.fee_payment_status === "verified"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : reseller.fee_payment_status === "receipt_uploaded"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : reseller.fee_payment_status === "rejected"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}>
                  {reseller.fee_payment_status === "verified"
                    ? "✓ Verified & Active"
                    : reseller.fee_payment_status === "receipt_uploaded"
                    ? "⏱ Receipt Uploaded (Pending Review)"
                    : reseller.fee_payment_status === "rejected"
                    ? "✕ Receipt Rejected"
                    : "Payment Pending"}
                </span>
              </div>
            </div>

            {/* Grid 1: Transaction Info + Franchise Agreement Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transaction & Bank Transfer Details */}
              <div className="p-5 rounded-2xl border border-border bg-bg space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                    <FiCreditCard size={16} /> Manual Payment Details
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-surface px-2 py-0.5 rounded border border-border">
                    Offline Transfer
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Bank UTR / Ref No.</span>
                    <span className="font-black font-mono text-sm text-text-primary">
                      {reseller.fee_payment_utr || "Not Provided"}
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Amount Paid</span>
                    <span className="font-black text-sm text-emerald-600">
                      ₹{Number(reseller.fee_payment_amount || 50000).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Payment Date</span>
                    <span className="font-semibold text-text-primary">
                      {reseller.fee_payment_date ? new Date(reseller.fee_payment_date).toLocaleDateString() : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Verification Status</span>
                    <span className="font-bold text-text-primary capitalize">
                      {reseller.fee_payment_status || "pending_payment"}
                    </span>
                  </div>
                </div>

                {reseller.fee_payment_remarks && (
                  <div className="p-3 rounded-xl bg-surface border border-border text-xs">
                    <span className="text-text-muted text-[10px] font-bold uppercase block">Verification Remarks</span>
                    <p className="text-text-primary font-medium mt-0.5">{reseller.fee_payment_remarks}</p>
                  </div>
                )}
              </div>

              {/* Digital Franchise Agreement Details */}
              <div className="p-5 rounded-2xl border border-border bg-bg space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                    <FiFileText size={16} /> Digital Franchise Agreement
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    reseller.agreement_status === "signed"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {reseller.agreement_status === "signed" ? "✓ Digitally Signed" : "Pending Signature"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Signatory Legal Name</span>
                    <span className="font-bold text-text-primary">
                      {reseller.agreement_signer_name || reseller.contact_person || reseller.business_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Signed Timestamp</span>
                    <span className="font-semibold text-text-secondary">
                      {reseller.agreement_signed_at ? new Date(reseller.agreement_signed_at).toLocaleString() : "Awaiting Partner Execution"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border text-[11px] text-text-muted">
                    Franchise Agreement terms include regional distribution exclusivity, pre-engineered kit wholesale margins, and factory warranty coverage.
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 2: Uploaded Receipt Preview & Document Link */}
            <div className="p-5 rounded-2xl border border-border bg-bg space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <FiEye size={16} /> Uploaded Bank Payment Receipt Slip
                </div>
                {reseller.fee_payment_receipt_url && (
                  <a
                    href={getDocUrl(reseller.fee_payment_receipt_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <FiExternalLink size={12} /> Open in New Tab
                  </a>
                )}
              </div>

              {reseller.fee_payment_receipt_url ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-surface border border-border">
                  <div className="w-40 h-40 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={getDocUrl(reseller.fee_payment_receipt_url)}
                      alt="Payment Slip Preview"
                      className="w-full h-full object-contain hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/300x300?text=Payment+Receipt+PDF";
                      }}
                    />
                  </div>

                  <div className="space-y-3 flex-1 text-xs">
                    <div>
                      <h4 className="font-bold text-text-primary text-sm">Payment Receipt Document</h4>
                      <p className="text-text-muted font-mono text-[11px] mt-0.5 truncate max-w-md">
                        {reseller.fee_payment_receipt_url}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setViewDoc({
                            name: `Payment Receipt - ${reseller.business_name}`,
                            url: getDocUrl(reseller.fee_payment_receipt_url),
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-hover"
                      >
                        <FiEye size={14} /> Full View 👁️
                      </button>
                      <a
                        href={getDocUrl(reseller.fee_payment_receipt_url)}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 border border-slate-300"
                      >
                        <FiExternalLink size={14} /> Download Receipt
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-text-muted font-semibold bg-surface rounded-xl border border-dashed border-border">
                  No payment slip uploaded yet by the partner.
                </div>
              )}
            </div>

            {/* Grid 3: Admin Review Decision Controls */}
            <div className="p-5 rounded-2xl border border-border bg-gradient-to-br from-surface to-bg space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wider">
                <FiCheckCircle size={16} className="text-emerald-600" /> Admin Receipt Verification & Account Activation
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Verification Remarks / Notes (Sent to Partner)
                </label>
                <textarea
                  rows={2}
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder="e.g. Verified transaction against SolarKits HDFC Bank statement. All details matched."
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => handleVerifyFeePayment("reject")}
                  className="px-5 py-2.5 rounded-xl bg-danger-soft text-danger hover:bg-danger hover:text-white border border-danger/20 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <FiXCircle size={15} />
                  <span>Reject Payment Slip</span>
                </button>

                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => handleVerifyFeePayment("approve")}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                >
                  {verifyingPayment ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={15} />}
                  <span>Approve Receipt & Activate Franchise Partner</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            3. BUSINESS PROFILE TAB
        ════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="space-y-6">

            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FiUser className="text-primary" /> Reseller Business Profile
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Complete business registration, tax identities, and contact information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Business Identity */}
              <div className="p-5 rounded-2xl border border-border bg-bg space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <FiBriefcase size={16} /> Business Identity
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Company / Firm Name</span>
                    <span className="font-extrabold text-text-primary text-sm">{reseller.business_name}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Reseller Category</span>
                    <span className="font-bold text-text-secondary">{reseller.reseller_type?.name || "Standard Reseller"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Commercial Operating Mode</span>
                    <span className="font-extrabold text-primary capitalize">{reseller.commercial_mode} Mode</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-text-muted block text-[11px] font-semibold">GSTIN Number</span>
                    <span className="font-mono font-bold text-text-primary text-xs">{reseller.gst_number || "Not Provided"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">PAN Number</span>
                    <span className="font-mono font-bold text-text-primary text-xs">{reseller.pan_number || "Not Provided"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Aadhaar (Masked)</span>
                    <span className="font-mono font-bold text-text-primary text-xs">{reseller.aadhaar_masked || "Not Provided"}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-5 rounded-2xl border border-border bg-bg space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <FiMail size={16} /> Contact & Communication
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Contact Person</span>
                    <span className="font-bold text-text-primary">{reseller.contact_person || reseller.business_name}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Business Email</span>
                    <span className="font-bold text-text-primary flex items-center gap-1">
                      <FiMail size={12} className="text-text-muted" /> {reseller.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Mobile / WhatsApp</span>
                    <span className="font-bold text-text-primary flex items-center gap-1">
                      <FiPhone size={12} className="text-text-muted" /> {reseller.mobile}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-text-muted block text-[11px] font-semibold">Registered GST State</span>
                    <span className="font-bold text-primary bg-info-soft px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                      {reseller.address?.gst_state_name || reseller.address?.state || "Not Set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">City / District</span>
                    <span className="font-bold text-text-secondary">{reseller.address?.city || reseller.address?.district || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Account Status & Timestamps */}
              <div className="p-5 rounded-2xl border border-border bg-bg space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <FiShield size={16} /> Account Status & Compliance
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Activation Status</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold capitalize mt-0.5 ${
                      reseller.activation_status === "active" ? "bg-success-soft text-success border border-success/20" : "bg-danger-soft text-danger border border-danger/20"
                    }`}>
                      {reseller.activation_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">KYC Verification</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize mt-0.5 ${
                      reseller.kyc_status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      KYC {reseller.kyc_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px] font-semibold">Agreement Status</span>
                    <span className="font-bold text-text-secondary capitalize">{reseller.agreement_status || "Pending Agreement"}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-text-muted block text-[11px] font-semibold">Registration Timestamp</span>
                    <span className="font-semibold text-text-secondary">{new Date(reseller.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            3. PLAN & TERRITORY TAB
        ════════════════════════════════════════════ */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            {/* Active Subscription Plan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <FiFileText className="text-primary" /> Active Plan Subscription
                </h3>
                <Link
                  to="/admin-panel/solar-shop/india/reseller-management/plans"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Manage Plans →
                </Link>
              </div>

              {activeSub ? (
                <div className="p-5 rounded-2xl border border-border bg-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-success-soft text-success border border-success/20">
                      Active Plan
                    </span>
                    <h4 className="text-lg font-black text-text-primary">{activeSub.plan_id?.name || "Assigned Plan"}</h4>
                    <p className="text-xs text-text-muted">
                      Fee: <strong>₹{(activeSub.plan_id?.price_paise || 0) / 100}</strong> • Max Territories: <strong>{activeSub.plan_id?.allowed_territories_count || 1}</strong>
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="text-text-muted">Subscribed: <span className="font-bold text-text-primary">{new Date(activeSub.created_at).toLocaleDateString()}</span></div>
                    <div className="text-text-muted">Expires: <span className="font-bold text-text-primary">{activeSub.expiry_date ? new Date(activeSub.expiry_date).toLocaleDateString() : "Never / Lifetime"}</span></div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-bg text-center space-y-2">
                  <p className="text-sm font-semibold text-text-muted">No active plan subscription assigned to this reseller.</p>
                  <p className="text-xs text-text-muted">Reseller uses system default plan tiers.</p>
                </div>
              )}
            </div>

            {/* Active Territory Assignments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <FiMapPin className="text-primary" /> Authorized Sales Territories ({territories.length})
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">Geographical boundary authorizations assigned to this reseller</p>
                </div>
                <Link
                  to="/admin-panel/solar-shop/india/reseller-management/territories"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-xs"
                >
                  <FiPlus size={14} /> Assign Territory
                </Link>
              </div>

              {territories.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-bg text-center text-xs text-text-muted font-medium">
                  No explicit territory rules assigned. System defaults to registered GST state boundary ({reseller.address?.gst_state_name || "State"}).
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border bg-bg text-text-muted uppercase font-bold tracking-wider">
                        <th className="px-4 py-3">Scope Level</th>
                        <th className="px-4 py-3">Location Name</th>
                        <th className="px-4 py-3">Precedence Source</th>
                        <th className="px-4 py-3">Override Reason</th>
                        <th className="px-4 py-3">Assigned Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {territories.map((t) => (
                        <tr key={t.id || t._id} className="hover:bg-surface-hover">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-bg border border-border text-[11px] font-bold uppercase tracking-wider text-text-primary">
                              {t.scope_level || t.territory_level || "district"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-primary">{t.location_name}</td>
                          <td className="px-4 py-3"><SourceBadge source={t.precedence_source || t.source} /></td>
                          <td className="px-4 py-3 text-text-secondary">{t.override_reason || "—"}</td>
                          <td className="px-4 py-3 text-text-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            4. AUDIT TRAIL TAB
        ════════════════════════════════════════════ */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FiClock className="text-primary" /> Reseller Account Audit Trail ({auditHistory.length})
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Chronological record of status changes, KYC reviews, and system activities</p>
            </div>

            {auditHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted font-medium">
                No audit trail logs recorded for this reseller yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-bg text-text-muted uppercase font-bold tracking-wider">
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action Event</th>
                      <th className="px-4 py-3">Actor Type</th>
                      <th className="px-4 py-3">Snapshot / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {auditHistory.map((log) => (
                      <tr key={log.id || log._id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 text-text-muted font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-text-primary">
                          <span className="px-2 py-0.5 rounded-md bg-info-soft text-primary font-mono text-[11px] uppercase border border-primary/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize font-semibold text-text-secondary">
                          {log.actor_type || "system"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary max-w-md truncate font-mono text-[11px]">
                          {log.snapshot ? JSON.stringify(log.snapshot) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KYC Review Modal */}
      {kycModal && (
        <KycReviewModal
          decision={kycModal}
          resellerName={reseller.business_name}
          onClose={() => setKycModal(null)}
          onConfirm={handleKycReview}
        />
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <DocViewerModal
          docName={viewDoc.name}
          docUrl={viewDoc.url}
          onClose={() => setViewDoc(null)}
        />
      )}
    </div>
  );
}
