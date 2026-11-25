<<<<<<< HEAD
import { useEffect, useState } from "react";
=======
import { useEffect, useState, useRef } from "react";
>>>>>>> origin/main
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import FranchiseeAgreementManagement from "../franchisee-clusters/FranchiseeAgreementManagement";
import {
  FiAlertTriangle,
  FiSave,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiEye,
<<<<<<< HEAD
  FiCode,
  FiBook,
=======
  FiPlus,
  FiTrash2,
  FiLayers,
  FiEdit2,
  FiUploadCloud,
  FiX,
  FiAlertCircle,
  FiInfo,
>>>>>>> origin/main
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL;

<<<<<<< HEAD
=======
// ─── Document URL Resolver Helper ────────────────────────────────────────────
const resolveDocUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  const cleanPath = url.replace(/^[\\/]+/, "").replace(/\\/g, "/");
  const baseUrl = (API_BASE || "").replace(/\/admin-api\/?$/, "");
  return `${baseUrl}/${cleanPath}`;
};

// ─── File Size Formatter Helper ──────────────────────────────────────────────
const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

>>>>>>> origin/main
// ─── Reusable Toggle ────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
<<<<<<< HEAD
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${value ? "bg-primary" : "bg-bg-card-hover"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-1"
          }`}
=======
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? "bg-blue-600" : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
>>>>>>> origin/main
      />
    </button>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
<<<<<<< HEAD
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
=======
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
>>>>>>> origin/main
      </div>
    </div>
  );
}

<<<<<<< HEAD
// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-text-primary">{label}</div>
        {hint && <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const DEFAULT_MASTER_AGREEMENT_TEMPLATE = `SOLARKITS AUTHORIZED FRANCHISE PARTNER AGREEMENT

This Franchise Distribution & Commercial Channel Agreement ("Agreement") is formally entered into and effective as of {{AGREEMENT_DATE}} by and between:

1. THE COMPANY:
SolarKits Clean Energy Solutions Private Limited, having its corporate fulfillment center and technology office in India (hereinafter referred to as the "Company" or "SolarKits").

2. THE FRANCHISE PARTNER:
{{BUSINESS_NAME}}, represented by authorized signatory {{PARTNER_NAME}}, having registered commercial premises at {{TERRITORY}}, with GSTIN: {{GSTIN}} (hereinafter referred to as the "Franchise Partner" or "Franchisee").

RECITALS & PURPOSE:
WHEREAS the Company is engaged in the manufacturing, assembly, and turnkey supply of pre-engineered Solar BOS Combo Kits, mono PERC / TopCon panels, on-grid/hybrid inverters, module mounting structures, and associated electrical accessories.
WHEREAS the Franchise Partner desires to obtain authorized distribution, retail demonstration, and local EPC contractor procurement fulfillment rights for the Designated Territory of {{TERRITORY}}.

NOW THEREFORE, the parties mutually agree as follows:

CLAUSE 1 — APPOINTMENT & TERRITORY AUTHORIZATION
1.1 The Company hereby authorizes the Franchise Partner as an Official SolarKits Franchisee for the designated territory of {{TERRITORY}}.
1.2 The Franchise Partner is authorized to promote, stock, distribute, and supply turnkey SolarKits Combo Packages to local EPC contractors, solar installers, commercial clients, and residential end-users.

CLAUSE 2 — COMMERCIAL TERMS, PRICING & MARGINS
2.1 Franchise Partner shall receive guaranteed factory-direct wholesale pricing, exclusive bundle margin slabs, and procurement discounts across all pre-engineered kits.
2.2 The Commercial Model assigned to Franchise Partner is {{COMMERCIAL_MODE}}.
2.3 Margin settlements and incentive payouts shall be governed by platform settlement policies and credited to Franchise Partner's dedicated wallet.

CLAUSE 3 — QUALITY ASSURANCE & WARRANTY
3.1 Franchise Partner covenants to supply only genuine SolarKits certified modules, inverters, and BOS accessories.
3.2 All components carry standard manufacturer warranties (25-year panel performance, 5/10-year inverter replacement warranty).

CLAUSE 4 — REGISTRATION & ONE-TIME FEE SETTLEMENT
4.1 Franchise onboarding requires digital signature of this Agreement and verification of the franchise fee settlement.
4.2 Upon verification, full operational platform access, priority stock allocation, and regional lead routing will be unlocked immediately.

CLAUSE 5 — TERM, RENEWAL & TERMINATION
5.1 This Agreement is valid for a period of 12 (twelve) months from the date of activation and shall renew annually based on minimum order quantity (MOQ) targets and mutual agreement.
5.2 Either party may terminate this agreement with 30 days written notice in case of breach of quality compliance or exclusivity guidelines.

CLAUSE 6 — GOVERNING LAW & JURISDICTION
6.1 This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in India.

[DIGITAL EXECUTION DECLARATION]
By digitally signing below, the Franchise Partner certifies that they have read, understood, and accept all terms and conditions of this Franchise Agreement.`;

=======
>>>>>>> origin/main
export default function ResellerSettings({ moduleUniqueId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "agreements";
  const currentTab = rawTab === "template" ? "template" : "agreements";

  const [settings, setSettings] = useState(null);
  const [original, setOriginal] = useState(null);
<<<<<<< HEAD
  const [rzpStatus, setRzpStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState(null);
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);
=======
  const [storeTypes, setStoreTypes] = useState([]);
  const [rzpStatus, setRzpStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── Modal State for Type-Wise Agreement Form ──────────────────────────────
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingTypeIndex, setEditingTypeIndex] = useState(null);
  const [modalForm, setModalForm] = useState({
    type_key: "",
    name: "",
    store_type_id: null,
    store_type_slug: "",
    store_type_name: "",
    title: "",
    version: "1.0",
    default_duration_years: 2,
    document_url: null,
    document_name: null,
    is_active: true,
  });
  const [modalPdfFile, setModalPdfFile] = useState(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const modalFileInputRef = useRef(null);
>>>>>>> origin/main

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
<<<<<<< HEAD
      const [res, rzpRes] = await Promise.all([
        axios.get(`${API_BASE}/reseller-mgmt/settings`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/reseller-mgmt/razorpay/status`, { headers: authHeaderObj() }).catch(() => null),
      ]);
      if (res.data?.status === "success") {
        setSettings({ ...res.data.data });
        setOriginal({ ...res.data.data });
=======
      const [res, rzpRes, plansRes] = await Promise.all([
        axios.get(`${API_BASE}/reseller-mgmt/settings`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/reseller-mgmt/razorpay/status`, { headers: authHeaderObj() }).catch(() => null),
        axios.get(`${API_BASE}/resellers/plans/list?req_for=view&unique_id=RSL_PLAN`, { headers: authHeaderObj() }).catch(() => null),
      ]);
      if (res.data?.status === "success") {
        const data = res.data.data || {};
        if (!data.franchise_agreement_types || data.franchise_agreement_types.length === 0) {
          data.franchise_agreement_types = [
            {
              type_key: "district_franchise_agreement",
              name: "District Franchise Agreement",
              store_type_slug: "district-franchise-store",
              store_type_name: "District Franchise Store",
              title: "SolarKits Authorized District Franchise Partner Agreement",
              version: "2.0",
              default_duration_years: 2,
              document_url: null,
              document_name: null,
              is_active: true,
            },
            {
              type_key: "flagship_agreement",
              name: "Flagship Store Agreement",
              store_type_slug: "flagship-store",
              store_type_name: "Flagship store",
              title: "SolarKits Flagship Franchise Partner & Institutional Agreement",
              version: "2.0",
              default_duration_years: 3,
              document_url: null,
              document_name: null,
              is_active: true,
            },
            {
              type_key: "company_store_agreement",
              name: "Company Store Operational Agreement",
              store_type_slug: "company-store",
              store_type_name: "Company Store",
              title: "SolarKits Company Store Operational Governance & MoU",
              version: "1.0",
              default_duration_years: 1,
              document_url: null,
              document_name: null,
              is_active: true,
            },
          ];
        }
        setSettings({ ...data });
        setOriginal(JSON.parse(JSON.stringify(data)));
>>>>>>> origin/main
      }
      if (rzpRes?.data?.status === "success") {
        setRzpStatus(rzpRes.data.data);
      }
<<<<<<< HEAD
=======
      if (plansRes?.data?.data && Array.isArray(plansRes.data.data)) {
        setStoreTypes(plansRes.data.data);
      }
>>>>>>> origin/main
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

<<<<<<< HEAD
  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const POLICY_FIELDS = [
    "settlement_trigger",
    "territory_exclusivity_mode",
    "platform_commission_pct",
    "pgw_charge_pct",
    "activation_require_signed_agreement",
    "activation_require_active_plan",
  ];

  const changedFields = settings && original
    ? Object.keys(settings).filter((k) => k !== "_id" && k !== "__v" && k !== "updated_at" && k !== "_is_default" && settings[k] !== original[k])
    : [];

  const sensitiveChanged = changedFields.some((f) => POLICY_FIELDS.includes(f));
  const hasChanges = changedFields.length > 0;

  const handleSave = async () => {
    if (sensitiveChanged && !reason.trim()) {
      showToast("error", "A reason is required when changing policy-sensitive fields.");
      return;
    }
    try {
      setSaving(true);
      const payload = {};
      changedFields.forEach((k) => { payload[k] = settings[k]; });
      if (reason.trim()) payload.reason = reason.trim();

      const res = await axios.put(`${API_BASE}/reseller-mgmt/settings`, payload, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setOriginal({ ...settings });
        setReason("");
        showToast("success", "Settings saved successfully.");
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
=======
  const agreementTypes = settings?.franchise_agreement_types || [];

  // ─── Modal Handlers ────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    const defaultStore = storeTypes[0] || null;
    const storeName = defaultStore ? defaultStore.name : "District Franchise Store";
    const newIndex = agreementTypes.length + 1;
    setEditingTypeIndex(null);
    setModalPdfFile(null);
    setModalForm({
      type_key: `agreement_type_${Date.now()}`,
      name: defaultStore ? `${defaultStore.name} Agreement` : `Franchise Agreement Type ${newIndex}`,
      store_type_id: defaultStore?.id || defaultStore?._id || null,
      store_type_slug: defaultStore?.slug || "",
      store_type_name: storeName,
      title: defaultStore ? `SolarKits Authorized ${defaultStore.name} Agreement` : `SolarKits Franchise Partner Agreement`,
      version: "1.0",
      default_duration_years: defaultStore?.validity_value || 2,
      document_url: null,
      document_name: null,
      is_active: true,
    });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditModal = (index) => {
    const t = agreementTypes[index];
    if (!t) return;
    setEditingTypeIndex(index);
    setModalPdfFile(null);
    setModalForm({
      type_key: t.type_key || `agreement_type_${Date.now()}`,
      name: t.name || "",
      store_type_id: t.store_type_id || null,
      store_type_slug: t.store_type_slug || "",
      store_type_name: t.store_type_name || "",
      title: t.title || "",
      version: t.version || "1.0",
      default_duration_years: t.default_duration_years || 2,
      document_url: t.document_url || null,
      document_name: t.document_name || null,
      is_active: t.is_active !== false,
    });
    setIsTypeModalOpen(true);
  };

  const handleModalPdfSelect = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showToast("error", "Please select a valid PDF agreement template (.pdf)");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast("error", "Agreement PDF size must be less than 25 MB");
      return;
    }
    setModalPdfFile(file);
  };

  const handleSaveAgreementTypeModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!modalForm.name?.trim()) {
      showToast("error", "Please enter an Agreement Type Name");
      return;
    }
    if (!modalForm.title?.trim()) {
      showToast("error", "Please enter a Formal Agreement Document Title");
      return;
    }

    setModalUploading(true);
    try {
      let uploadedUrl = modalForm.document_url || null;
      let uploadedName = modalForm.document_name || null;

      // 1. If a new PDF file is selected, upload it
      if (modalPdfFile) {
        const fd = new FormData();
        fd.append("agreement_pdf", modalPdfFile);
        const uploadRes = await axios.post(
          `${API_BASE}/reseller-mgmt/settings/agreement-types/upload`,
          fd,
          {
            headers: {
              ...authHeaderObj(),
              "Content-Type": "multipart/form-data",
            },
          }
        );
        if (uploadRes.data?.status === "success" && uploadRes.data?.data) {
          uploadedUrl = uploadRes.data.data.document_url;
          uploadedName = uploadRes.data.data.document_name || modalPdfFile.name;
        } else {
          throw new Error(uploadRes.data?.message || "Failed to upload document");
        }
      }

      const updatedItem = {
        ...modalForm,
        document_url: uploadedUrl,
        document_name: uploadedName,
      };

      const currentList = [...agreementTypes];
      if (editingTypeIndex !== null && editingTypeIndex >= 0) {
        currentList[editingTypeIndex] = updatedItem;
      } else {
        currentList.push(updatedItem);
      }

      // 2. Persist to settings
      const saveRes = await axios.put(
        `${API_BASE}/reseller-mgmt/settings`,
        { franchise_agreement_types: currentList },
        { headers: authHeaderObj() }
      );

      if (saveRes.data?.status === "success") {
        const updatedData = saveRes.data.data || { ...settings, franchise_agreement_types: currentList };
        setSettings(updatedData);
        setOriginal(JSON.parse(JSON.stringify(updatedData)));
        setIsTypeModalOpen(false);
        setModalPdfFile(null);
        showToast("success", `Franchise Agreement Type "${updatedItem.name}" saved successfully`);
      } else {
        throw new Error(saveRes.data?.message || "Failed to save settings");
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || err.message || "Failed to save agreement type");
    } finally {
      setModalUploading(false);
    }
  };

  const handleDeleteAgreementType = async (index) => {
    if (agreementTypes.length <= 1) {
      showToast("error", "At least one Franchise Agreement Type must remain defined.");
      return;
    }
    const itemToDelete = agreementTypes[index];
    if (!window.confirm(`Are you sure you want to delete "${itemToDelete?.name || 'this agreement type'}"?`)) {
      return;
    }

    const currentList = [...agreementTypes];
    currentList.splice(index, 1);

    try {
      const saveRes = await axios.put(
        `${API_BASE}/reseller-mgmt/settings`,
        { franchise_agreement_types: currentList },
        { headers: authHeaderObj() }
      );
      if (saveRes.data?.status === "success") {
        const updatedData = saveRes.data.data || { ...settings, franchise_agreement_types: currentList };
        setSettings(updatedData);
        setOriginal(JSON.parse(JSON.stringify(updatedData)));
        showToast("success", "Agreement type removed successfully.");
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to delete agreement type");
    }
  };

  const handleToggleStatus = async (index) => {
    const currentList = [...agreementTypes];
    const item = currentList[index];
    if (!item) return;
    const updatedItem = { ...item, is_active: !item.is_active };
    currentList[index] = updatedItem;

    try {
      const saveRes = await axios.put(
        `${API_BASE}/reseller-mgmt/settings`,
        { franchise_agreement_types: currentList },
        { headers: authHeaderObj() }
      );
      if (saveRes.data?.status === "success") {
        const updatedData = saveRes.data.data || { ...settings, franchise_agreement_types: currentList };
        setSettings(updatedData);
        setOriginal(JSON.parse(JSON.stringify(updatedData)));
        showToast("success", `Status updated for "${item.name}"`);
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to update status");
>>>>>>> origin/main
    }
  };

  const TABS = [
    {
      id: "agreements",
      label: "Franchisee Agreements",
      badge: "Lifecycle & Tracking",
      icon: FiFileText,
    },
    {
      id: "template",
<<<<<<< HEAD
      label: "Master Legal Template",
      badge: "Clauses & Dynamic Tags",
      icon: FiBook,
=======
      label: "Franchise Agreement Types",
      badge: "Store Types & PDF Templates",
      icon: FiLayers,
>>>>>>> origin/main
    },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Navigation Tabs (Pill Style) ──────────────────────────────── */}
<<<<<<< HEAD
      <div className="bg-bg-card border border-border rounded-2xl p-2 shadow-xs flex items-center justify-between flex-wrap gap-2">
=======
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs flex items-center justify-between flex-wrap gap-2">
>>>>>>> origin/main
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
<<<<<<< HEAD
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card-hover"
                  }`}
=======
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
>>>>>>> origin/main
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
<<<<<<< HEAD
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-bg text-text-muted"
                      }`}
=======
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
>>>>>>> origin/main
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

<<<<<<< HEAD
        {currentTab !== "agreements" && (
=======
        {currentTab === "template" && (
>>>>>>> origin/main
          <div className="flex items-center gap-2 px-2">
            <button
              type="button"
              onClick={fetchSettings}
              disabled={loading}
<<<<<<< HEAD
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-card-hover transition-colors cursor-pointer"
            >
              <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {saving ? <FiRefreshCw size={12} className="animate-spin" /> : <FiSave size={12} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
=======
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
>>>>>>> origin/main
          </div>
        )}
      </div>

      {/* ── Toast Feedback ─────────────────────────────────────────────────── */}
      {toast && (
        <div
<<<<<<< HEAD
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold border ${toast.type === "success"
              ? "bg-success-soft text-success border-success/30"
              : "bg-danger-soft text-danger border-danger/30"
            }`}
=======
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
>>>>>>> origin/main
        >
          {toast.type === "success" ? <FiCheckCircle size={15} /> : <FiXCircle size={15} />}
          {toast.message}
        </div>
      )}

<<<<<<< HEAD
      {/* ── Tab 1: New Logic — Franchisee Agreement Management (Screenshot 2) ── */}
=======
      {/* ── Tab 1: Franchisee Agreement Management (Lifecycle & Tracking) ───── */}
>>>>>>> origin/main
      {currentTab === "agreements" && (
        <FranchiseeAgreementManagement />
      )}

<<<<<<< HEAD
      {/* ── Tab 2: Old Logic — Master Legal Agreement Template (Screenshot 1) ── */}
      {currentTab === "template" && (
        loading && !settings ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
            <FiRefreshCw className="animate-spin text-primary" size={20} />
            Loading template settings...
          </div>
        ) : settings && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <SectionHeader
                  icon={FiFileText}
                  title="Franchise Master Legal Agreement Template"
                  subtitle="Configure terms, distribution rights & legal clauses shown to Franchise Partners for signing"
=======
      {/* ── Tab 2: Franchise Agreement Types & PDF Templates ────────────────── */}
      {currentTab === "template" && (
        loading && !settings ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2 bg-white rounded-2xl border border-slate-200">
            <FiRefreshCw className="animate-spin text-blue-600" size={20} />
            Loading agreement types...
          </div>
        ) : settings && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
                <SectionHeader
                  icon={FiLayers}
                  title="Franchise Agreement Types & Documents"
                  subtitle="Define franchise agreement types mapped to store types and upload official agreement document templates"
>>>>>>> origin/main
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
<<<<<<< HEAD
                    onClick={() => setShowAgreementPreview(!showAgreementPreview)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover transition cursor-pointer"
                  >
                    <FiEye size={13} className="text-primary" />
                    <span>{showAgreementPreview ? "Hide Preview" : "Live Preview"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("franchise_agreement_template", DEFAULT_MASTER_AGREEMENT_TEMPLATE)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition cursor-pointer"
                  >
                    <FiRefreshCw size={12} />
                    <span>Load Default 2026 Template</span>
=======
                    onClick={fetchSettings}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-xs"
                  >
                    <FiPlus size={15} />
                    <span>Add Agreement Type</span>
>>>>>>> origin/main
                  </button>
                </div>
              </div>

<<<<<<< HEAD
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Agreement Title
                  </label>
                  <input
                    type="text"
                    value={settings.franchise_agreement_title || "SolarKits Authorized Franchise Partner Agreement"}
                    onChange={(e) => handleChange("franchise_agreement_title", e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Agreement Version / Revision
                  </label>
                  <input
                    type="text"
                    value={settings.franchise_agreement_version || "2.0"}
                    onChange={(e) => handleChange("franchise_agreement_version", e.target.value)}
                    placeholder="e.g. 2.0 (2026 Reconciled)"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Dynamic Placeholders Tag Helper */}
              <div className="p-3.5 rounded-xl bg-bg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <FiCode size={13} className="text-primary" /> Supported Dynamic Tags (Click to copy):
                  </span>
                  <span className="text-[10px] text-text-muted">Tags are automatically replaced with partner data</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: "{{BUSINESS_NAME}}", desc: "Partner Company Name" },
                    { tag: "{{PARTNER_NAME}}", desc: "Signatory Person Name" },
                    { tag: "{{TERRITORY}}", desc: "Assigned District / State" },
                    { tag: "{{GSTIN}}", desc: "Partner GSTIN Number" },
                    { tag: "{{COMMERCIAL_MODE}}", desc: "Commercial Model Type" },
                    { tag: "{{AGREEMENT_DATE}}", desc: "Current / Sign Date" },
                    { tag: "{{AGREEMENT_NUMBER}}", desc: "Auto Agreement Serial #" },
                    { tag: "{{EMAIL}}", desc: "Registered Email" },
                    { tag: "{{MOBILE}}", desc: "Registered Mobile" },
                  ].map(({ tag, desc }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tag);
                        showToast("success", `Copied ${tag} to clipboard`);
                      }}
                      title={desc}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-mono text-primary hover:border-primary hover:bg-primary/5 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>{tag}</span>
                      <span className="text-[9px] text-text-muted">({desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agreement Textarea */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5 flex items-center justify-between">
                  <span>Master Agreement Full Legal Text & Clauses</span>
                  <span className="text-[10px] text-text-muted">Supports formatted text & clauses</span>
                </label>
                <textarea
                  rows={14}
                  value={settings.franchise_agreement_template || DEFAULT_MASTER_AGREEMENT_TEMPLATE}
                  onChange={(e) => handleChange("franchise_agreement_template", e.target.value)}
                  placeholder="Write standard master franchise distribution agreement text..."
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-bg text-xs text-text-primary font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>

              {/* Live Preview Drawer */}
              {showAgreementPreview && (
                <div className="p-5 rounded-2xl bg-surface border border-primary/30 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Partner Portal Preview
                      </span>
                      <h4 className="text-sm font-bold text-text-primary mt-1">
                        {settings.franchise_agreement_title || "SolarKits Authorized Franchise Partner Agreement"} (v{settings.franchise_agreement_version || "2.0"})
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-text-muted">Demo Agreement: SK-FRN-AGR-2026-DEMO01</span>
                  </div>

                  <div className="h-64 overflow-y-auto p-4 rounded-xl bg-bg border border-border text-xs text-text-primary font-sans leading-relaxed whitespace-pre-wrap">
                    {(settings.franchise_agreement_template || DEFAULT_MASTER_AGREEMENT_TEMPLATE)
                      .replace(/\{\{AGREEMENT_DATE\}\}/g, new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }))
                      .replace(/\{\{AGREEMENT_NUMBER\}\}/g, "SK-FRN-AGR-2026-DEMO01")
                      .replace(/\{\{BUSINESS_NAME\}\}/g, "Apex Solar Clean Energy LLP")
                      .replace(/\{\{PARTNER_NAME\}\}/g, "Ramesh Chandra (Managing Partner)")
                      .replace(/\{\{TERRITORY\}\}/g, "Ahmedabad, Gujarat")
                      .replace(/\{\{GSTIN\}\}/g, "24AAACS1234F1Z8")
                      .replace(/\{\{COMMERCIAL_MODE\}\}/g, "Commission Settlement Mode")
                      .replace(/\{\{EMAIL\}\}/g, "partner@apexsolar.com")
                      .replace(/\{\{MOBILE\}\}/g, "+91 9876543210")}
                  </div>
                </div>
              )}
            </div>

            {/* Reason Box (for policy-sensitive changes) */}
            {sensitiveChanged && (
              <div className="bg-warning-soft border border-warning/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-warning text-xs font-bold">
                  <FiAlertTriangle size={15} /> Policy-Sensitive Change Detected
                </div>
                <p className="text-[11px] text-text-muted">
                  You are changing one or more policy-sensitive fields. Please provide a reason (for audit log).
                </p>
                <textarea
                  rows={2}
                  placeholder="Reason for change (required)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-warning/30 resize-none"
                />
              </div>
            )}

            {/* Changed Fields Preview */}
            {hasChanges && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <div className="text-xs font-bold text-primary mb-2">
                  {changedFields.length} unsaved change{changedFields.length !== 1 ? "s" : ""}
                </div>
                <div className="flex flex-wrap gap-2">
                  {changedFields.map((f) => (
                    <span key={f} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold">
                      {f}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? <FiRefreshCw size={13} className="animate-spin" /> : <FiSave size={13} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSettings({ ...original }); setReason(""); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-card-hover transition-colors cursor-pointer"
                  >
                    Discard
                  </button>
=======
              {/* Cluster Fee Info Note */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                <FiInfo className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-900">Cluster-Based Commercial Structure: </span>
                  Setup fees, renewal charges, and security deposits are defined Cluster-wise in{" "}
                  <strong>Franchise Cluster Management</strong>. Each partner agreement automatically inherits the commercial fees from their assigned cluster.
                </div>
              </div>

              {/* Table of Agreement Types */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Agreement Type & Title</th>
                      <th className="py-3 px-4">Mapped Store Type</th>
                      <th className="py-3 px-4">Version & Validity</th>
                      <th className="py-3 px-4">Agreement Document (PDF)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {agreementTypes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No franchise agreement types configured. Click "+ Add Agreement Type" to create one.
                        </td>
                      </tr>
                    ) : (
                      agreementTypes.map((t, idx) => (
                        <tr key={t.type_key || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs">{t.name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                              {t.title || "SolarKits Authorized Franchise Partner Agreement"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <FiLayers size={11} /> {t.store_type_name || "General Franchise Store"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {t.store_type_slug?.includes("company") ? "Company Store" : "Franchisee Store"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-black bg-slate-100 border border-slate-200 text-slate-700">
                                v{t.version || "1.0"}
                              </span>
                              <span className="text-xs text-slate-600 font-medium">
                                {t.default_duration_years || 2} {Number(t.default_duration_years) === 1 ? "Year" : "Years"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {t.document_url ? (
                              <a
                                href={resolveDocUrl(t.document_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer"
                                title={t.document_name || "View Agreement Template PDF"}
                              >
                                <FiFileText className="text-red-500 shrink-0" size={13} />
                                <span className="truncate max-w-[160px]">
                                  {t.document_name || "Agreement_Template.pdf"}
                                </span>
                                <FiEye size={12} className="shrink-0" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                                <FiAlertCircle size={12} /> No PDF Attached
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Toggle
                                value={t.is_active !== false}
                                onChange={() => handleToggleStatus(idx)}
                              />
                              <span className={`text-[11px] font-bold ${t.is_active !== false ? "text-emerald-600" : "text-slate-400"}`}>
                                {t.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(idx)}
                                className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Edit Agreement Type & Document"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAgreementType(idx)}
                                disabled={agreementTypes.length <= 1}
                                className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={agreementTypes.length <= 1 ? "At least one type must remain" : "Delete Agreement Type"}
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Type-Wise Modal Form for Add/Edit Agreement Type ── */}
            {isTypeModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-200">
                  {/* Modal Header */}
                  <div className="px-6 py-4.5 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {editingTypeIndex !== null ? "Edit Franchise Agreement Type" : "Add Franchise Agreement Type"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {editingTypeIndex !== null
                          ? `Update configuration and PDF template for "${modalForm.name}"`
                          : "Configure agreement type mapped to store type and upload official agreement PDF"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => !modalUploading && setIsTypeModalOpen(false)}
                      disabled={modalUploading}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <FiX size={18} />
                    </button>
                  </div>

                  {/* Modal Form */}
                  <form onSubmit={handleSaveAgreementTypeModal}>
                    <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-white">
                      {/* Store Type Dropdown */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Mapped Franchise Store Type (From Store Type Settings) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={modalForm.store_type_slug || ""}
                          onChange={(e) => {
                            const slug = e.target.value;
                            const matchedStore = storeTypes.find((st) => st.slug === slug);
                            setModalForm((prev) => ({
                              ...prev,
                              store_type_slug: slug,
                              store_type_name: matchedStore ? matchedStore.name : "Franchisee Store",
                              store_type_id: matchedStore ? (matchedStore.id || matchedStore._id) : null,
                              name: prev.name || (matchedStore ? `${matchedStore.name} Agreement` : ""),
                              title: prev.title || (matchedStore ? `SolarKits Authorized ${matchedStore.name} Agreement` : ""),
                              default_duration_years: matchedStore?.validity_value || prev.default_duration_years || 2,
                            }));
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-xs"
                        >
                          <option value="">-- General Franchise Store --</option>
                          {storeTypes.map((st) => (
                            <option key={st.id || st._id || st.slug} value={st.slug}>
                              {st.name} ({st.store_category === "company_store" ? "Company Store" : "Franchisee Store"})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Agreement Type Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Agreement Type Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.name || ""}
                          onChange={(e) => setModalForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. District Franchise Agreement"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-xs"
                        />
                      </div>

                      {/* Formal Agreement Document Title */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Formal Agreement Document Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.title || ""}
                          onChange={(e) => setModalForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. SolarKits Authorized District Franchise Partner Agreement"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-xs"
                        />
                      </div>

                      {/* Version & Default Duration */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Agreement Version
                          </label>
                          <input
                            type="text"
                            value={modalForm.version || "1.0"}
                            onChange={(e) => setModalForm((prev) => ({ ...prev, version: e.target.value }))}
                            placeholder="e.g. 1.0 or 2.0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Default Validity Duration
                          </label>
                          <select
                            value={modalForm.default_duration_years || 2}
                            onChange={(e) => setModalForm((prev) => ({ ...prev, default_duration_years: Number(e.target.value) }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-xs"
                          >
                            <option value={1}>1 Year</option>
                            <option value={2}>2 Years</option>
                            <option value={3}>3 Years</option>
                            <option value={5}>5 Years</option>
                          </select>
                        </div>
                      </div>

                      {/* Official PDF Document Upload */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Franchise Agreement Document (PDF)</span>
                          <span className="text-[11px] text-slate-400 font-normal">PDF only, max 25MB</span>
                        </label>

                        {/* Existing document if present */}
                        {modalForm.document_url && !modalPdfFile && (
                          <div className="mb-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <FiFileText className="text-red-500 shrink-0" size={18} />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 truncate block" title={modalForm.document_name || "Agreement Template.pdf"}>
                                  {modalForm.document_name || "Existing Agreement Template.pdf"}
                                </span>
                                <span className="text-[11px] text-blue-600 font-medium">Currently attached official template</span>
                              </div>
                            </div>
                            <a
                              href={resolveDocUrl(modalForm.document_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-blue-700 transition shrink-0"
                            >
                              <FiEye size={12} /> View Current
                            </a>
                          </div>
                        )}

                        {/* Dropzone / Upload Box */}
                        {!modalPdfFile ? (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsModalDragging(true); }}
                            onDragLeave={() => setIsModalDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsModalDragging(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleModalPdfSelect(file);
                            }}
                            onClick={() => modalFileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                              isModalDragging
                                ? "border-blue-600 bg-blue-50/80 scale-[1.01]"
                                : "border-slate-200 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20"
                            }`}
                          >
                            <input
                              type="file"
                              ref={modalFileInputRef}
                              accept="application/pdf,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleModalPdfSelect(file);
                              }}
                            />
                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1">
                                <FiUploadCloud size={24} />
                              </div>
                              <div className="font-bold text-slate-800 text-xs">
                                {modalForm.document_url ? "Click to replace PDF template or drag & drop" : "Click to upload Agreement PDF template or drag & drop"}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Upload official Franchise Partner Agreement document (.pdf)
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <FiFileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs truncate" title={modalPdfFile.name}>
                                  {modalPdfFile.name}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{formatFileSize(modalPdfFile.size)}</span>
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                    <FiCheckCircle size={12} /> Ready to upload
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalPdfFile(null);
                                if (modalFileInputRef.current) modalFileInputRef.current.value = "";
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Remove selected file"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Active Status Row */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Active Agreement Type</span>
                          <span className="text-[11px] text-slate-500">Available to assign to franchise partners when active</span>
                        </div>
                        <Toggle
                          value={modalForm.is_active !== false}
                          onChange={(val) => setModalForm((prev) => ({ ...prev, is_active: val }))}
                        />
                      </div>

                      {/* Fees cluster info */}
                      <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5">
                        <FiInfo className="text-blue-600 shrink-0 mt-0.5" size={15} />
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          <strong>Note:</strong> Commercial fees (setup fees, renewal fees, security deposit) are managed Cluster-wise under Franchise Cluster Management and dynamically applied to partner agreements.
                        </p>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
                      <button
                        type="button"
                        disabled={modalUploading}
                        onClick={() => setIsTypeModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white hover:border-slate-300 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={modalUploading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-60"
                      >
                        {modalUploading ? <FiRefreshCw size={13} className="animate-spin" /> : <FiSave size={13} />}
                        <span>{modalUploading ? "Uploading & Saving..." : (editingTypeIndex !== null ? "Save Changes" : "Create Agreement Type")}</span>
                      </button>
                    </div>
                  </form>
>>>>>>> origin/main
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
