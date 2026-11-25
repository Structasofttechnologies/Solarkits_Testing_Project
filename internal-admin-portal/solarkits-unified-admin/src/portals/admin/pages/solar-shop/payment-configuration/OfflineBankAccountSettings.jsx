import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiCreditCard,
  FiSliders,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiInfo,
  FiHash,
  FiBriefcase,
  FiShield,
  FiCheckSquare,
} from "react-icons/fi";
import { FaPercent } from "react-icons/fa";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;

const IFSC_BANK_MAP = {
  ICIC: "ICICI Bank",
  HDFC: "HDFC Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  BARB: "Bank of Baroda",
  YESB: "Yes Bank",
  IDIB: "Indian Bank",
  UBIN: "Union Bank of India",
  CANR: "Canara Bank",
  CNRB: "Canara Bank",
  INDB: "IndusInd Bank",
  MAHB: "Bank of Maharashtra",
  IDFB: "IDFC First Bank",
  FDRL: "Federal Bank",
  IOBA: "Indian Overseas Bank",
  UCBA: "UCO Bank",
  BKID: "Bank of India",
  CBIN: "Central Bank of India",
  PSIB: "Punjab & Sind Bank",
  RATN: "RBL Bank",
  KVBL: "Karur Vysya Bank",
  SIBL: "South Indian Bank",
  SCBL: "Standard Chartered Bank",
  CITI: "Citibank",
  HSBC: "HSBC Bank",
  AUBL: "AU Small Finance Bank",
  ESFB: "Equitas Small Finance Bank",
  UTKS: "Utkarsh Small Finance Bank",
  UJVN: "Ujjivan Small Finance Bank",
  JAKA: "Jammu & Kashmir Bank",
  BDBL: "Bandhan Bank",
};

const detectBankName = (code) => {
  if (!code || typeof code !== "string") return "";
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return IFSC_BANK_MAP[clean.substring(0, 4)] || "";
};

export default function OfflineBankAccountSettings() {
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const showAlert = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => {
      setMsg({ type: "", text: "" });
    }, 6000);
  };

  const fetchBankDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/payment-config/bank-account`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data?.data) {
        const d = res.data.data;
        setAccountNumber(d.account_number || "");
        setIfscCode(d.ifsc_code || "");
        setAccountHolderName(d.account_holder_name || "");
        setBankName(d.bank_name || detectBankName(d.ifsc_code) || "");
        setLastUpdated(d.updated_at || null);
      }
    } catch (err) {
      console.error("Failed to fetch offline bank details:", err);
      showAlert("error", "Failed to load bank account settings. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const handleIfscChange = (val) => {
    const cleaned = val.toUpperCase().replace(/\s/g, "");
    setIfscCode(cleaned);
    const detected = detectBankName(cleaned);
    if (detected && (!bankName || bankName === detectBankName(ifscCode))) {
      setBankName(detected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accountNumber.trim()) {
      showAlert("error", "Account Number is required.");
      return;
    }
    if (!ifscCode.trim()) {
      showAlert("error", "IFSC Code is required.");
      return;
    }
    if (!accountHolderName.trim()) {
      showAlert("error", "Account Holder Name is required.");
      return;
    }

    const cleanedIfsc = ifscCode.trim().toUpperCase().replace(/\s/g, "");
    if (cleanedIfsc.length < 4) {
      showAlert("error", "Please enter a valid IFSC Code.");
      return;
    }

    const resolvedBankName = bankName.trim() || detectBankName(cleanedIfsc) || "";

    setSaving(true);
    try {
      const payload = {
        account_number: accountNumber.trim().replace(/\s/g, ""),
        ifsc_code: cleanedIfsc,
        account_holder_name: accountHolderName.trim(),
        bank_name: resolvedBankName,
      };

      const res = await axios.put(`${ADMIN_API}/payment-config/bank-account`, payload, {
        headers: authHeaderObj(),
      });

      if (res.data?.status === "success") {
        showAlert("success", "Company bank account details saved successfully! All updates reflect dynamically in Franchise Fee and EPC Checkout.");
        if (res.data.data) {
          setAccountNumber(res.data.data.account_number);
          setIfscCode(res.data.data.ifsc_code);
          setAccountHolderName(res.data.data.account_holder_name);
          setBankName(res.data.data.bank_name || resolvedBankName);
          setLastUpdated(res.data.data.updated_at || new Date().toISOString());
        }
      }
    } catch (err) {
      console.error("Failed to update bank details:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to save bank details.";
      showAlert("error", errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      {/* ── Top Header & Breadcrumb ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium mb-1">
            <span>Payment Configuration</span>
            <span>/</span>
            <span className="text-amber-600 font-semibold">Offline Bank Account Settings</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <FiCreditCard className="w-6 h-6" />
            </span>
            Offline Bank Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure the official company bank account details used for all offline NEFT / RTGS / IMPS payments.
            These details are dynamically displayed to Franchisees and EPC Contractors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBankDetails}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Payment Configuration Navigation Tabs ──────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Link
          to="/admin-panel/solar-shop/payment-configuration"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <FiSliders className="w-4 h-4" />
          <span>Region Payment Settings</span>
        </Link>
        <Link
          to="/admin-panel/solar-shop/payment-configuration/milestones"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <FaPercent className="w-3.5 h-3.5" />
          <span>Payment Milestones</span>
        </Link>
        <Link
          to="/admin-panel/solar-shop/payment-configuration/offline-approvals"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <FiCheckSquare className="w-4 h-4" />
          <span>Offline Approval Queue</span>
        </Link>
        <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
          <FiCreditCard className="w-4 h-4" />
          <span>Offline Bank Account Settings</span>
        </span>
      </div>

      {/* ── Alert Messages ─────────────────────────────────────────────── */}
      {msg.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold ${msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60"
            }`}
        >
          {msg.type === "success" ? (
            <FiCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <FiAlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ── Main Layout: Form + Live Preview ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiCreditCard className="text-amber-500" />
              Company Bank Account Configuration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter the exact banking credentials registered with your commercial bank. All fields are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Account Holder Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FiBriefcase className="text-amber-500" />
                <span>Account Holder Name *</span>
              </label>
              <input
                type="text"
                required
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="e.g. SolarKits Technologies Pvt Ltd"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-850 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Official entity name as registered in the company bank account.
              </span>
            </div>

            {/* Field 2: Bank Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FiCreditCard className="text-amber-500" />
                <span>Bank Name *</span>
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. ICICI Bank, HDFC Bank, State Bank of India"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-850 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Official commercial bank name (auto-detected from IFSC or customized).
              </span>
            </div>

            {/* Field 3: Account Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FiHash className="text-amber-500" />
                <span>Account Number *</span>
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\s/g, ""))}
                placeholder="e.g. 50200088991122"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-850 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Company bank account number for NEFT / RTGS / IMPS transfers.
              </span>
            </div>

            {/* Field 4: IFSC Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FiShield className="text-amber-500" />
                <span>IFSC Code *</span>
              </label>
              <input
                type="text"
                required
                value={ifscCode}
                onChange={(e) => handleIfscChange(e.target.value)}
                placeholder="e.g. ICIC0000624 or HDFC0001234"
                maxLength={16}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-850 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                11-character Indian Financial System Code (e.g. ICICI0006248, HDFC0001234).
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                {lastUpdated
                  ? `Last updated: ${new Date(lastUpdated).toLocaleString("en-IN")}`
                  : "No prior update record"}
              </span>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Details...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    <span>Save Bank Account Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FiInfo className="text-blue-500" /> Live Preview
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                Active System Snapshot
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              This is how your bank details appear dynamically to Franchisees and EPC Contractors:
            </p>

            {/* Preview Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/40 dark:from-slate-850 dark:to-slate-800 border border-amber-200 dark:border-slate-700 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-slate-700 pb-2.5">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                  Company Bank Account Details
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Offline NEFT / RTGS</span>
              </div>

              {/* Account Holder Name */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                    Account Holder Name
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                    {accountHolderName || <span className="text-slate-300 italic">Not configured</span>}
                  </span>
                </div>
                {accountHolderName && (
                  <button
                    type="button"
                    onClick={() => handleCopy(accountHolderName, "holder")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Copy Name"
                  >
                    {copiedField === "holder" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  </button>
                )}
              </div>

              {/* Bank Name */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                    Bank Name
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                    {bankName || detectBankName(ifscCode) || <span className="text-slate-300 italic font-sans text-xs">Not configured</span>}
                  </span>
                </div>
                {(bankName || detectBankName(ifscCode)) && (
                  <button
                    type="button"
                    onClick={() => handleCopy(bankName || detectBankName(ifscCode), "bank")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Copy Bank Name"
                  >
                    {copiedField === "bank" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  </button>
                )}
              </div>

              {/* Account Number */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                    Account Number
                  </span>
                  <span className="text-base font-mono font-black text-slate-900 dark:text-white mt-0.5 block tracking-wider">
                    {accountNumber || <span className="text-slate-300 italic font-sans text-sm">Not configured</span>}
                  </span>
                </div>
                {accountNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, "acc")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Copy Account Number"
                  >
                    {copiedField === "acc" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  </button>
                )}
              </div>

              {/* IFSC Code */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                    IFSC Code
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5 block tracking-wider">
                    {ifscCode || <span className="text-slate-300 italic font-sans">Not configured</span>}
                  </span>
                </div>
                {ifscCode && (
                  <button
                    type="button"
                    onClick={() => handleCopy(ifscCode, "ifsc")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Copy IFSC Code"
                  >
                    {copiedField === "ifsc" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  </button>
                )}
              </div>
            </div>

            {/* Integration Notice */}
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <FiInfo className="text-blue-600" /> System Integration Active:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 dark:text-blue-300">
                <li>
                  <strong>Franchise Fee Receipt:</strong> Displays in Step 4 onboarding fee modal for all prospective franchisees.
                </li>
                <li>
                  <strong>EPC Solar Store Checkout:</strong> Displays dynamically when region payment mode is Offline or Both.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
