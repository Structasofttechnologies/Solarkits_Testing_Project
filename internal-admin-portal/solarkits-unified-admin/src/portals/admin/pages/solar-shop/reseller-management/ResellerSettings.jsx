import { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { INDIAN_STATES_DISTRICTS } from "./territoryData";
import {
  FiSettings,
  FiShield,
  FiAlertTriangle,
  FiSave,
  FiRefreshCw,
  FiPercent,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiEye,
  FiCode,
  FiBook,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiPlus,
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL;

// ─── Reusable Toggle ────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? "bg-primary" : "bg-bg-card-hover"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

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

export default function ResellerSettings({ moduleUniqueId }) {
  const [settings, setSettings] = useState(null);
  const [original, setOriginal] = useState(null);
  const [rzpStatus, setRzpStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState(null);
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);

  // ── Flagship Store Excluded Districts State ──
  const [newExcludedState, setNewExcludedState] = useState("Maharashtra");
  const [newExcludedDistrict, setNewExcludedDistrict] = useState("Pune");
  const [newExcludedReason, setNewExcludedReason] = useState("Company Flagship Store");

  const availableDistrictsForNew = useMemo(() => {
    return INDIAN_STATES_DISTRICTS[newExcludedState] || [];
  }, [newExcludedState]);

  const handleStateChange = (stateName) => {
    setNewExcludedState(stateName);
    const firstDistrict = (INDIAN_STATES_DISTRICTS[stateName] || [])[0] || "";
    setNewExcludedDistrict(firstDistrict);
  };

  const handleAddExcludedDistrict = () => {
    if (!newExcludedState || !newExcludedDistrict) return;
    const currentList = settings?.flagship_excluded_districts || [];
    const exists = currentList.some(
      (item) =>
        item.state?.toLowerCase() === newExcludedState.toLowerCase() &&
        item.district?.toLowerCase() === newExcludedDistrict.toLowerCase()
    );
    if (exists) {
      showToast("error", `${newExcludedDistrict} (${newExcludedState}) is already marked as excluded.`);
      return;
    }
    const updated = [
      ...currentList,
      {
        state: newExcludedState,
        district: newExcludedDistrict,
        reason: newExcludedReason.trim() || "Company Flagship Store",
        added_at: new Date().toISOString(),
      },
    ];
    handleChange("flagship_excluded_districts", updated);
    showToast("success", `Added ${newExcludedDistrict} (${newExcludedState}) to excluded districts. Click "Save Changes" to save.`);
  };

  const handleRemoveExcludedDistrict = (index) => {
    const currentList = settings?.flagship_excluded_districts || [];
    const removedItem = currentList[index];
    const updated = currentList.filter((_, idx) => idx !== index);
    handleChange("flagship_excluded_districts", updated);
    if (removedItem) {
      showToast("success", `Removed ${removedItem.district} from excluded districts. Click "Save Changes" to save.`);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [res, rzpRes] = await Promise.all([
        axios.get(`${API_BASE}/reseller-mgmt/settings`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/reseller-mgmt/razorpay/status`, { headers: authHeaderObj() }).catch(() => null),
      ]);
      if (res.data?.status === "success") {
        setSettings({ ...res.data.data });
        setOriginal({ ...res.data.data });
      }
      if (rzpRes?.data?.status === "success") {
        setRzpStatus(rzpRes.data.data);
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiRefreshCw className="animate-spin text-primary" size={28} />
        <span className="ml-3 text-sm text-text-muted font-medium">Loading platform settings...</span>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-text-primary flex items-center gap-2">
            <FiFileText className="text-primary" size={22} />
            Franchise Policy & Store Settings
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Manage Territory Exclusions for Flagship Stores, Franchise Agreements & Commercial Settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-card-hover transition-colors cursor-pointer"
          >
            <FiRefreshCw size={13} /> Refresh
          </button>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? <FiRefreshCw size={13} className="animate-spin" /> : <FiSave size={13} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold border ${
            toast.type === "success"
              ? "bg-success-soft text-success border-success/30"
              : "bg-danger-soft text-danger border-danger/30"
          }`}
        >
          {toast.type === "success" ? <FiCheckCircle size={15} /> : <FiXCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* ─── Razorpay Gateway & Other Platform Settings (Hidden for now as requested) ── */}
      {/*
      {rzpStatus && (
        <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm">
          <SectionHeader icon={FiShield} title="Razorpay Payment Gateway Status" subtitle="Gateway health & credential status (Key Secret is securely masked)" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div className="p-3.5 rounded-xl bg-bg border border-border">
              <div className="text-[11px] font-semibold text-text-muted">Integration Status</div>
              <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
                {rzpStatus.is_configured ? (
                  <span className="text-success flex items-center gap-1"><FiCheckCircle size={15} /> Active & Configured</span>
                ) : (
                  <span className="text-danger flex items-center gap-1"><FiXCircle size={15} /> Missing Credentials</span>
                )}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-bg border border-border">
              <div className="text-[11px] font-semibold text-text-muted">Gateway Mode</div>
              <div className="text-sm font-bold text-text-primary mt-1 flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-xs uppercase font-extrabold ${rzpStatus.mode === 'test' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {rzpStatus.mode} mode
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-bg border border-border">
              <div className="text-[11px] font-semibold text-text-muted">Public Key ID</div>
              <div className="text-xs font-mono text-text-primary mt-1">{rzpStatus.key_id_masked}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={FiClock} title="Checkout & Cart" subtitle="Timer and cart expiry configuration" />
        <FieldRow label="Enable Checkout Timer" hint="Auto-releases reserved stock when customer doesn't complete payment in time.">
          <Toggle value={!!settings.enable_checkout_timer} onChange={(v) => handleChange("enable_checkout_timer", v)} />
        </FieldRow>
        <FieldRow label="Checkout Timer Duration (minutes)" hint="How many minutes a cart reservation stays active.">
          <input
            type="number"
            min={5}
            max={120}
            value={settings.checkout_timer_duration ?? 20}
            onChange={(e) => handleChange("checkout_timer_duration", Number(e.target.value))}
            className="w-24 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldRow>
        <FieldRow label="Combo Kit Bulk Panels Limit" hint="Maximum number of panels allowed in a single bulk combo kit.">
          <input
            type="number"
            min={1}
            max={500}
            value={settings.combokit_bulk_panels_limit ?? 30}
            onChange={(e) => handleChange("combokit_bulk_panels_limit", Number(e.target.value))}
            className="w-24 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldRow>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={FiPercent} title="GST & Financials" subtitle="Tax rates and payment gateway charges" />
        <FieldRow label="GST Rate (%)" hint="Applied to all Solarshop transactions.">
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={settings.gst_rate ?? 13.8}
            onChange={(e) => handleChange("gst_rate", parseFloat(e.target.value))}
            className="w-28 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldRow>
        <FieldRow label="Platform Commission (%)" hint="⚠️ Policy-sensitive: requires a reason to change.">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={settings.platform_commission_pct ?? 0}
            onChange={(e) => handleChange("platform_commission_pct", parseFloat(e.target.value))}
            className="w-28 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldRow>
        <FieldRow label="Payment Gateway Charge (%)" hint="⚠️ Policy-sensitive: requires a reason to change.">
          <input
            type="number"
            min={0}
            max={20}
            step={0.01}
            value={settings.pgw_charge_pct ?? 2}
            onChange={(e) => handleChange("pgw_charge_pct", parseFloat(e.target.value))}
            className="w-28 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldRow>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={FiMapPin} title="Territory & Settlement Policy" subtitle="Exclusivity rules and payout triggers" />
        <FieldRow label="Territory Exclusivity Mode" hint="⚠️ Policy-sensitive. 'Strict' = one franchisee per territory. 'Open' = shared territories.">
          <select
            value={settings.territory_exclusivity_mode ?? "strict"}
            onChange={(e) => handleChange("territory_exclusivity_mode", e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="strict">Strict (Exclusive)</option>
            <option value="open">Open (Shared)</option>
          </select>
        </FieldRow>
        <FieldRow label="Settlement Trigger" hint="⚠️ Policy-sensitive. When franchisee wallet gets credited after an order.">
          <select
            value={settings.settlement_trigger ?? "delivery_plus_window"}
            onChange={(e) => handleChange("settlement_trigger", e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="delivery_plus_window">Delivery + Return Window</option>
            <option value="on_delivery">On Delivery</option>
            <option value="on_payment">On Payment</option>
          </select>
        </FieldRow>
        <FieldRow label="Settlement Return Window (days)" hint="How many days after delivery before wallet credits.">
          <input
            type="number"
            min={0}
            max={30}
            value={settings.settlement_return_window_days ?? 7}
            onChange={(e) => handleChange("settlement_return_window_days", Number(e.target.value))}
            className="w-24 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldRow>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={FiShield} title="EPC GST Re-verification" subtitle="When to force EPC to re-verify GST" />
        <FieldRow label="GST Re-verify Policy" hint="When EPC businesses must re-verify their GST registration.">
          <select
            value={settings.epc_gst_reverify_policy ?? "onboarding_only"}
            onChange={(e) => handleChange("epc_gst_reverify_policy", e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="onboarding_only">Onboarding Only</option>
            <option value="periodic">Periodic (every N days)</option>
            <option value="never">Never</option>
          </select>
        </FieldRow>
        {settings.epc_gst_reverify_policy === "periodic" && (
          <FieldRow label="Re-verify Every (days)" hint="How frequently EPC must re-verify GST.">
            <input
              type="number"
              min={30}
              max={365}
              value={settings.epc_gst_reverify_days ?? 90}
              onChange={(e) => handleChange("epc_gst_reverify_days", Number(e.target.value))}
              className="w-24 px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-text-primary text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </FieldRow>
        )}
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <SectionHeader
          icon={FiCheckCircle}
          title="Franchisee Activation Requirements"
          subtitle="Which conditions must be met before a franchisee can go active"
        />
        {[
          { key: "activation_require_gst_verified", label: "Require GST Verified", hint: "Franchisee must have a verified GST number." },
          { key: "activation_require_kyc_approved", label: "Require KYC Approved", hint: "Franchisee KYC documents must be approved by admin." },
          { key: "activation_require_signed_agreement", label: "Require Signed Agreement", hint: "⚠️ Policy-sensitive: franchisee must sign the agreement." },
          { key: "activation_require_active_plan", label: "Require Active Plan", hint: "⚠️ Policy-sensitive: franchisee must have a paid active subscription." },
          { key: "activation_require_territory_assigned", label: "Require Territory Assigned", hint: "At least one territory must be assigned." },
          { key: "activation_require_product_auth", label: "Require Product Authorization", hint: "At least one product category must be authorized." },
        ].map(({ key, label, hint }) => (
          <FieldRow key={key} label={label} hint={hint}>
            <Toggle value={!!settings[key]} onChange={(v) => handleChange(key, v)} />
          </FieldRow>
        ))}
      </div>
      */}

      {/* ─── Company Flagship Store Districts (Territory Exclusions) ──────── */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <SectionHeader
            icon={FiMapPin}
            title="Company Flagship Store Districts (Franchisee Exclusions)"
            subtitle="Districts where SolarKits operates a flagship company store. Prospective franchisees cannot apply for these excluded territories in the storefront application modal."
          />
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            {(settings.flagship_excluded_districts || []).length} Excluded Districts
          </span>
        </div>

        {/* Add new excluded district box */}
        <div className="p-4 rounded-xl bg-bg border border-border space-y-3">
          <div className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <FiPlus className="text-primary" /> Add Flagship Store Territory Exclusion
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">State</label>
              <select
                value={newExcludedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg-card text-xs text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">District</label>
              <select
                value={newExcludedDistrict}
                onChange={(e) => setNewExcludedDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg-card text-xs text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {availableDistrictsForNew.map((dst) => (
                  <option key={dst} value={dst}>{dst}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">Reason / Note</label>
              <input
                type="text"
                value={newExcludedReason}
                onChange={(e) => setNewExcludedReason(e.target.value)}
                placeholder="e.g. Flagship Store"
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg-card text-xs text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={handleAddExcludedDistrict}
                className="w-full px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FiPlus size={14} /> Exclude District
              </button>
            </div>
          </div>
        </div>

        {/* List of currently excluded districts */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Active Excluded Districts List
          </div>
          {(!settings.flagship_excluded_districts || settings.flagship_excluded_districts.length === 0) ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
              No districts excluded yet. All territories are currently open for prospective franchisees.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {settings.flagship_excluded_districts.map((item, idx) => (
                <div
                  key={`${item.state}-${item.district}-${idx}`}
                  className="p-3 rounded-xl bg-bg border border-border flex items-center justify-between gap-2 group hover:border-border-hover transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs font-bold text-text-primary truncate">{item.district}</span>
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      {item.state} • <span className="text-text-secondary">{item.reason || "Flagship Store"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExcludedDistrict(idx)}
                    title="Remove exclusion"
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 6. Franchise Partner Master Agreement Template & Legal Content ──────── */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <SectionHeader
            icon={FiFileText}
            title="Franchise Master Legal Agreement Template"
            subtitle="Configure terms, distribution rights & legal clauses shown to Franchise Partners for signing"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
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
            </button>
          </div>
        </div>

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

      {/* ─── Reason Box (for policy-sensitive changes) ─────────────────────── */}
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

      {/* ─── Changed Fields Preview ─────────────────────────────────────────── */}
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
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? <FiRefreshCw size={13} className="animate-spin" /> : <FiSave size={13} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => { setSettings({ ...original }); setReason(""); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-card-hover transition-colors cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
