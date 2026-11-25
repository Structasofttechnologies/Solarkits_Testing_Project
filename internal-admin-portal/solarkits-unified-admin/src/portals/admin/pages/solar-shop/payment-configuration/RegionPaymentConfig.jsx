import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiCreditCard,
  FiSliders,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiRefreshCw,
  FiSearch,
  FiEdit2,
  FiToggleLeft,
  FiToggleRight,
  FiShield,
  FiLayers,
  FiMapPin,
  FiCheck,
  FiX,
  FiInfo,
} from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;

export default function RegionPaymentConfig() {
  // ── States ────────────────────────────────────────────────────────────────
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Config Table State
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Form State
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [paymentMode, setPaymentMode] = useState("both"); // 'offline' | 'online' | 'both'
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [reqAccountsVerification, setReqAccountsVerification] = useState(true);
  const [reqAdminApproval, setReqAdminApproval] = useState(true);
  const [appliesTo, setAppliesTo] = useState(["epc_order", "fpo_order", "loose_order"]);
  const [isActive, setIsActive] = useState(true);

  // Edit Mode
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ── Load States on Mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetchStates();
    fetchConfigs(1);
  }, []);

  const fetchStates = async () => {
    setLoadingGeo(true);
    try {
      let res;
      try {
        res = await axios.get(`${ADMIN_API}/geolocation/get-states`, { headers: authHeaderObj() });
      } catch (e1) {
        res = await axios.get(`${API_BASE}/geolocation/get-states`, { headers: authHeaderObj() });
      }
      const data = res.data?.data || res.data || [];
      setStatesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load states:", err);
    } finally {
      setLoadingGeo(false);
    }
  };

  // ── Load Districts when State changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedStateId) {
      setDistrictsList([]);
      setSelectedDistrictId("");
      return;
    }
    fetchDistricts(selectedStateId);
  }, [selectedStateId]);

  const fetchDistricts = async (stateId) => {
    try {
      let res;
      try {
        res = await axios.get(`${ADMIN_API}/geolocation/get-districts?state_id=${stateId}`, {
          headers: authHeaderObj(),
        });
      } catch (e1) {
        res = await axios.get(`${API_BASE}/geolocation/get-districts?state_id=${stateId}`, {
          headers: authHeaderObj(),
        });
      }
      const data = res.data?.data || res.data || [];
      setDistrictsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load districts:", err);
      setDistrictsList([]);
    }
  };

  // ── Sync Toggles with Mode ────────────────────────────────────────────────
  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    if (mode === "offline") {
      setOfflineEnabled(true);
      setOnlineEnabled(false);
    } else if (mode === "online") {
      setOnlineEnabled(true);
      setOfflineEnabled(false);
    } else {
      setOnlineEnabled(true);
      setOfflineEnabled(true);
    }
  };

  // ── Toggle Order Scope ────────────────────────────────────────────────────
  const toggleScope = (scopeKey) => {
    if (appliesTo.includes(scopeKey)) {
      if (appliesTo.length === 1) {
        showMsg("error", "At least one order type must be selected.");
        return;
      }
      setAppliesTo(appliesTo.filter((s) => s !== scopeKey));
    } else {
      setAppliesTo([...appliesTo, scopeKey]);
    }
  };

  // ── Fetch Configs List ────────────────────────────────────────────────────
  const fetchConfigs = async (page = 1) => {
    setLoadingConfigs(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
      });
      if (search.trim()) params.append("search", search.trim());
      if (filterMode !== "all") params.append("payment_mode", filterMode);
      if (filterStatus !== "all") params.append("is_active", filterStatus === "active");

      const res = await axios.get(`${ADMIN_API}/payment-config/regions?${params.toString()}`, {
        headers: authHeaderObj(),
      });

      if (res.data?.status === "success") {
        setConfigs(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to fetch region payment configs:", err);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // ── Save / Update Config ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStateId) {
      showMsg("error", "Please select a State.");
      return;
    }
    if (!selectedDistrictId) {
      showMsg("error", "Please select a District.");
      return;
    }

    setSaving(true);
    setMsg({ type: "", text: "" });

    const stateObj = statesList.find((s) => (s._id || s.id) === selectedStateId);
    const districtObj = districtsList.find((d) => (d._id || d.id) === selectedDistrictId);

    const payload = {
      state_id: selectedStateId,
      state_name: stateObj?.name || "",
      district_id: selectedDistrictId,
      district_name: districtObj?.name || "",
      payment_mode: paymentMode,
      online_enabled: onlineEnabled,
      offline_enabled: offlineEnabled,
      offline_requires_accounts_verification: reqAccountsVerification,
      offline_requires_admin_approval: reqAdminApproval,
      applies_to: appliesTo,
      is_active: isActive,
    };

    try {
      if (editingId) {
        await axios.put(`${ADMIN_API}/payment-config/regions/${editingId}`, payload, {
          headers: authHeaderObj(),
        });
        showMsg("success", "Region payment configuration updated successfully!");
      } else {
        await axios.post(`${ADMIN_API}/payment-config/regions`, payload, {
          headers: authHeaderObj(),
        });
        showMsg("success", "Region payment configuration created successfully!");
      }

      resetForm();
      fetchConfigs(pagination.page);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Operation failed.";
      showMsg("error", errMsg);
    } finally {
      setSaving(false);
    }
  };

  // ── Quick Toggle Active State ─────────────────────────────────────────────
  const handleToggleActive = async (id, currentStatus) => {
    try {
      await axios.patch(
        `${ADMIN_API}/payment-config/regions/${id}/toggle`,
        { is_active: !currentStatus },
        { headers: authHeaderObj() }
      );
      setConfigs((prev) =>
        prev.map((c) => (c._id === id || c.id === id ? { ...c, is_active: !currentStatus } : c))
      );
      showMsg("success", `Configuration ${!currentStatus ? "activated" : "deactivated"}.`);
    } catch (err) {
      showMsg("error", "Failed to update configuration status.");
    }
  };

  // ── Populate Form for Editing ─────────────────────────────────────────────
  const handleEdit = (item) => {
    setEditingId(item._id || item.id);
    setSelectedStateId(item.state_id?._id || item.state_id?.id || item.state_id || "");
    setTimeout(() => {
      setSelectedDistrictId(item.district_id?._id || item.district_id?.id || item.district_id || "");
    }, 300);
    setPaymentMode(item.payment_mode || "both");
    setOnlineEnabled(Boolean(item.online_enabled));
    setOfflineEnabled(Boolean(item.offline_enabled));
    setReqAccountsVerification(Boolean(item.offline_requires_accounts_verification));
    setReqAdminApproval(Boolean(item.offline_requires_admin_approval));
    setAppliesTo(item.applies_to || ["epc_order", "fpo_order", "loose_order"]);
    setIsActive(Boolean(item.is_active));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedStateId("");
    setSelectedDistrictId("");
    setPaymentMode("both");
    setOnlineEnabled(true);
    setOfflineEnabled(true);
    setReqAccountsVerification(true);
    setReqAdminApproval(true);
    setAppliesTo(["epc_order", "fpo_order", "loose_order"]);
    setIsActive(true);
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => {
      setMsg({ type: "", text: "" });
    }, 4500);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <FiCreditCard className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Region Payment Gateway Configuration
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure Online ICICI eCollection and Offline UTR payment gateways by State & District
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchConfigs(1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <FiRefreshCw className={loadingConfigs ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Alert Feedback Banner ───────────────────────────────────────────── */}
      {msg.text && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            msg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {msg.type === "success" ? <FiCheckCircle className="text-lg flex-shrink-0" /> : <FiAlertCircle className="text-lg flex-shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* ── Configuration Form Card ─────────────────────────────────────────── */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FiSliders className="text-amber-500 text-lg" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingId ? "Edit Region Payment Configuration" : "New Region Payment Configuration"}
            </h2>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Region Cascade Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select State <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedStateId}
                onChange={(e) => setSelectedStateId(e.target.value)}
                disabled={Boolean(editingId)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
              >
                <option value="">Choose State...</option>
                {statesList.map((st) => (
                  <option key={st._id || st.id} value={st._id || st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select District <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrictId(e.target.value)}
              disabled={Boolean(editingId) || !selectedStateId}
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-60"
            >
              <option value="">
                {!selectedStateId ? "Select state first" : "Choose District..."}
              </option>
              {districtsList.map((dt) => (
                <option key={dt._id || dt.id} value={dt._id || dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Permitted Payment Method for this Region <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Offline */}
            <div
              onClick={() => handleModeChange("offline")}
              className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                paymentMode === "offline"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Offline Only</span>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMode === "offline" ? "border-blue-600 bg-blue-600" : "border-slate-400"
                  }`}
                >
                  {paymentMode === "offline" && <FiCheck className="text-white text-xs" />}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                EPC uploads bank transfer UTR and receipt. Requires Accounts & Admin verification.
              </p>
            </div>

            {/* Online */}
            <div
              onClick={() => handleModeChange("online")}
              className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                paymentMode === "online"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Online Only</span>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMode === "online" ? "border-emerald-600 bg-emerald-600" : "border-slate-400"
                  }`}
                >
                  {paymentMode === "online" && <FiCheck className="text-white text-xs" />}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ICICI Bank eCollection Virtual Account transfer with instant automatic callback reconciliation.
              </p>
            </div>

            {/* Both */}
            <div
              onClick={() => handleModeChange("both")}
              className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                paymentMode === "both"
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Both (Online + Offline)</span>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMode === "both" ? "border-amber-600 bg-amber-600" : "border-slate-400"
                  }`}
                >
                  {paymentMode === "both" && <FiCheck className="text-white text-xs" />}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Buyer selects either ICICI online instant payment or offline UTR submission at checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Gateway & Workflow Controls */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Gateway Controls & Workflow Approvals
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ICICI eCollection toggle */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  ICICI Bank eCollection Gateway
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Virtual Accounts & instant webhook confirmation
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOnlineEnabled(!onlineEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  onlineEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    onlineEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Offline UTR + Receipt toggle */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Offline Bank Transfer (UTR + Receipt)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Manual RTGS/NEFT payment proof submission
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOfflineEnabled(!offlineEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  offlineEnabled ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    offlineEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Requires Accounts Verification */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Accounts Team Verification
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Accounts department checks UTR & bank credit
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReqAccountsVerification(!reqAccountsVerification)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  reqAccountsVerification ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    reqAccountsVerification ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Requires Admin Approval */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Admin Final Order Approval
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Admin approves order before dispatch lifecycle starts
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReqAdminApproval(!reqAdminApproval)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  reqAdminApproval ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    reqAdminApproval ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Applies To & Active Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Applies To Order Types
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "epc_order", label: "EPC Orders" },
                { key: "fpo_order", label: "Franchisee PO" },
                { key: "loose_order", label: "Loose Orders" },
              ].map((item) => {
                const checked = appliesTo.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleScope(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                      checked
                        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}
                  >
                    {checked ? <FiCheck className="text-amber-600 dark:text-amber-400" /> : <span className="w-3" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 md:justify-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Configuration Status:
            </span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center gap-2 transition ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
              }`}
            >
              {isActive ? <FiToggleRight className="text-lg text-emerald-600" /> : <FiToggleLeft className="text-lg text-slate-400" />}
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <FiRefreshCw className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <FiSave /> {editingId ? "Update Configuration" : "Save Configuration"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Configured Regions Table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FiLayers className="text-slate-400 text-lg" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Configured Regions ({pagination.total})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search State or District..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchConfigs(1)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition w-56"
              />
            </div>

            {/* Filter by Mode */}
            <select
              value={filterMode}
              onChange={(e) => {
                setFilterMode(e.target.value);
                setTimeout(() => fetchConfigs(1), 50);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Modes</option>
              <option value="both">Both</option>
              <option value="online">Online Only</option>
              <option value="offline">Offline Only</option>
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setTimeout(() => fetchConfigs(1), 50);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Permitted Mode</th>
                <th className="py-3 px-4">ICICI Online</th>
                <th className="py-3 px-4">Offline UTR</th>
                <th className="py-3 px-4">Workflow Stages</th>
                <th className="py-3 px-4">Order Scope</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingConfigs ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <FiRefreshCw className="animate-spin inline mr-2 text-base" /> Loading payment configurations...
                  </td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No payment configurations found. Use the form above to configure a region.
                  </td>
                </tr>
              ) : (
                configs.map((c) => {
                  const stateName = c.state_name || c.state_id?.name || "-";
                  const districtName = c.district_name || c.district_id?.name || "-";
                  return (
                    <tr key={c._id || c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {stateName}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {districtName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            c.payment_mode === "both"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : c.payment_mode === "online"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {c.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            c.online_enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {c.online_enabled ? <FiCheckCircle /> : <FiX />}
                          {c.online_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            c.offline_enabled ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                          }`}
                        >
                          {c.offline_enabled ? <FiCheckCircle /> : <FiX />}
                          {c.offline_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {c.offline_requires_accounts_verification && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              • Accounts Verification
                            </span>
                          )}
                          {c.offline_requires_admin_approval && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              • Admin Approval
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(c.applies_to || []).map((a) => (
                            <span
                              key={a}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded text-slate-600 dark:text-slate-400"
                            >
                              {a.replace("_order", "")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c._id || c.id, c.is_active)}
                          title="Click to toggle active/inactive"
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit Configuration"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchConfigs(pagination.page - 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchConfigs(pagination.page + 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
