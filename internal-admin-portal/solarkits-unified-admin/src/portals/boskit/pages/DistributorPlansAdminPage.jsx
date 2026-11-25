import React, { useState, useEffect } from "react";
import {
  FiLayers,
  FiPlus,
  FiCheck,
  FiShield,
  FiUsers,
  FiEdit2,
  FiCopy,
  FiEye,
  FiTrash2,
  FiAlertTriangle,
  FiRefreshCw,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiX,
  FiDollarSign,
  FiMapPin,
  FiSliders,
  FiPackage,
  FiClock,
  FiFileText,
  FiStar,
  FiGrid,
  FiActivity,
  FiLock,
  FiSend,
  FiHelpCircle
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEFAULT_PLAN_FORM = {
  name: "",
  plan_code: "",
  short_description: "",
  description: "",
  joining_fee_inr: 25000,
  renewal_fee_inr: 10000,
  tax_rate_percent: 18,
  is_tax_inclusive: false,
  gst_hsn_code: "998399",
  billing_type: "annual_recurring",
  validity_value: 12,
  validity_unit: "months",
  auto_renew: false,
  grace_period_days: 15,
  renewal_rules: "",
  territory_type: "district",
  allowed_territories_count: 1,
  is_territory_exclusive: true,
  dealer_allowed: true,
  max_dealers: 15,
  can_onboard_dealers: true,
  dealer_direct_activation: false,
  dealer_pricing_permission: false,
  dealer_uses_admin_slabs_only: true,
  allows_all_products: true,
  product_access_type: "all",
  discount_percentage: 10,
  distributor_margin_slab_min: 8,
  distributor_margin_slab_max: 14,
  pricing_tier: "Standard Wholesale Slab",
  can_see_mrp: true,
  can_sell_direct: true,
  can_generate_quotes: true,
  lead_access_tier: "standard",
  leads_per_month: 25,
  inventory_visibility: "full",
  can_reserve_stock: true,
  stock_reservation_hours: 48,
  min_order_value_inr: 0,
  credit_limit_inr: 0,
  benefits: [
    "1 Dedicated Revenue District Exclusivity",
    "Up to 15 Registered Local Dealers",
    "Full BOS Component Whitelist",
    "Direct Manufacturer Warranty Dispatch",
    "Real-time Inventory Reservations",
  ],
  dashboard_modules: {
    overview: true,
    territories: true,
    catalogue: true,
    pricing: true,
    inventory: true,
    orders: true,
    customers: true,
    dealers: true,
    dealer_onboarding: true,
    leads: true,
    sales_reports: true,
    margin_reports: true,
    documents: true,
    support: true,
    subscriptions: true,
  },
  is_popular: false,
  badge_text: "Most Popular Distributor Plan",
  sort_order: 0,
  status: "published",
};

export default function DistributorPlansAdminPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, published, draft, archived, territory_allocations
  const [searchTerm, setSearchTerm] = useState("");
  const [territories, setTerritories] = useState([]);
  const [loadingTerritories, setLoadingTerritories] = useState(false);

  // Modal States
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_PLAN_FORM);
  const [editorActiveTab, setEditorActiveTab] = useState("basic"); // basic, commercials, territory, dealers, margins, benefits, modules, limits
  const [newBenefitInput, setNewBenefitInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [previewMode, setPreviewMode] = useState("card"); // card or dashboard

  // Migration & Versions Modal
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedPlanVersions, setSelectedPlanVersions] = useState([]);
  const [versionPlanName, setVersionPlanName] = useState("");

  // Toast message
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/plans`);
      if (res.data?.success && Array.isArray(res.data.plans)) {
        setPlans(res.data.plans);
      }
    } catch (err) {
      console.error("Error loading distributor plans:", err);
      showToast("Failed to load distributor plans from server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadTerritories = async () => {
    try {
      setLoadingTerritories(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/plans/territory-allocations`);
      if (res.data?.success) {
        setTerritories(res.data.territories || []);
      }
    } catch (err) {
      console.error("Error loading territory allocations:", err);
    } finally {
      setLoadingTerritories(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (activeTab === "territory_allocations") {
      loadTerritories();
    }
  }, [activeTab]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPlanId(null);
    setFormData({
      ...DEFAULT_PLAN_FORM,
      plan_code: `BK-DIST-TIER-${Date.now().toString().slice(-4)}`,
      sort_order: plans.length + 1,
    });
    setEditorActiveTab("basic");
    setShowEditorModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p) => {
    setEditingPlanId(p.id || p._id);
    setFormData({
      name: p.name || "",
      plan_code: p.plan_code || "",
      short_description: p.short_description || "",
      description: p.description || "",
      joining_fee_inr: p.joining_fee_inr ?? 25000,
      renewal_fee_inr: p.renewal_fee_inr ?? 10000,
      tax_rate_percent: p.tax_rate_percent ?? 18,
      is_tax_inclusive: p.is_tax_inclusive ?? false,
      gst_hsn_code: p.gst_hsn_code || "998399",
      billing_type: p.billing_type || "annual_recurring",
      validity_value: p.validity_value || 12,
      validity_unit: p.validity_unit || "months",
      auto_renew: p.auto_renew ?? false,
      grace_period_days: p.grace_period_days ?? 15,
      renewal_rules: p.renewal_rules || "",
      territory_type: p.territory_type || p.territory_level || "district",
      allowed_territories_count: p.allowed_territories_count || 1,
      is_territory_exclusive: p.is_territory_exclusive !== false,
      dealer_allowed: p.dealer_allowed !== false,
      max_dealers: p.max_dealers ?? 15,
      can_onboard_dealers: p.can_onboard_dealers !== false,
      dealer_direct_activation: p.dealer_direct_activation ?? false,
      dealer_pricing_permission: p.dealer_pricing_permission ?? false,
      dealer_uses_admin_slabs_only: p.dealer_uses_admin_slabs_only !== false,
      allows_all_products: p.allows_all_products !== false,
      product_access_type: p.product_access_type || "all",
      discount_percentage: p.discount_percentage ?? 10,
      distributor_margin_slab_min: p.distributor_margin_slab_min ?? 8,
      distributor_margin_slab_max: p.distributor_margin_slab_max ?? 14,
      pricing_tier: p.pricing_tier || "Standard Wholesale Slab",
      can_see_mrp: p.can_see_mrp !== false,
      can_sell_direct: p.can_sell_direct !== false,
      can_generate_quotes: p.can_generate_quotes !== false,
      lead_access_tier: p.lead_access_tier || "standard",
      leads_per_month: p.leads_per_month ?? 25,
      inventory_visibility: p.inventory_visibility || "full",
      can_reserve_stock: p.can_reserve_stock !== false,
      stock_reservation_hours: p.stock_reservation_hours ?? 48,
      min_order_value_inr: p.min_order_value_inr ?? 0,
      credit_limit_inr: p.credit_limit_inr ?? 0,
      benefits: p.benefits ? [...p.benefits] : [],
      dashboard_modules: p.dashboard_modules ? { ...p.dashboard_modules } : { ...DEFAULT_PLAN_FORM.dashboard_modules },
      is_popular: p.is_popular ?? false,
      badge_text: p.badge_text || "Most Popular Distributor Plan",
      sort_order: p.sort_order ?? 0,
      status: p.status || "published",
    });
    setEditorActiveTab("basic");
    setShowEditorModal(true);
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e) => {
    e?.preventDefault();
    if (!formData.name) {
      showToast("Please enter a valid plan name.", "error");
      return;
    }

    try {
      setSaving(true);
      if (editingPlanId) {
        // Update
        const res = await axios.put(`${API_BASE}/boskit/v1/admin/plans/${editingPlanId}`, formData);
        if (res.data?.success) {
          showToast(`Distributor plan updated successfully (Version ${res.data.version || 2})!`);
          setShowEditorModal(false);
          loadPlans();
        }
      } else {
        // Create
        const res = await axios.post(`${API_BASE}/boskit/v1/admin/plans`, formData);
        if (res.data?.success) {
          showToast("New Distributor Plan created and published successfully!");
          setShowEditorModal(false);
          loadPlans();
        }
      }
    } catch (err) {
      console.error("Save plan error:", err);
      showToast(err.response?.data?.message || "Failed to save plan.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Duplicate Plan
  const handleDuplicatePlan = async (p) => {
    try {
      const res = await axios.post(`${API_BASE}/boskit/v1/admin/plans/${p.id || p._id}/duplicate`);
      if (res.data?.success) {
        showToast(`Plan cloned as draft: ${res.data.plan?.name}`);
        loadPlans();
      }
    } catch (err) {
      console.error("Duplicate plan error:", err);
      showToast("Failed to duplicate plan.", "error");
    }
  };

  // Change Status (Publish / Unpublish / Archive)
  const handleSetStatus = async (p, status) => {
    try {
      const res = await axios.patch(`${API_BASE}/boskit/v1/admin/plans/${p.id || p._id}/status`, { status });
      if (res.data?.success) {
        showToast(`Plan status changed to ${status}.`);
        loadPlans();
      }
    } catch (err) {
      console.error("Change status error:", err);
      showToast("Failed to update status.", "error");
    }
  };

  // View Versions
  const handleViewVersions = async (p) => {
    try {
      setVersionPlanName(p.name);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/plans/${p.id || p._id}/versions`);
      if (res.data?.success) {
        setSelectedPlanVersions(res.data.versions || []);
        setShowVersionsModal(true);
      }
    } catch (err) {
      console.error("Fetch versions error:", err);
      showToast("Failed to fetch plan versions.", "error");
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (p) => {
    setPreviewPlan(p || formData);
    setPreviewMode("card");
    setShowPreviewModal(true);
  };

  // Dynamic Benefit Builder helpers
  const handleAddBenefit = () => {
    if (!newBenefitInput.trim()) return;
    setFormData({
      ...formData,
      benefits: [...formData.benefits, newBenefitInput.trim()],
    });
    setNewBenefitInput("");
  };

  const handleRemoveBenefit = (idx) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== idx),
    });
  };

  const handleMoveBenefit = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= formData.benefits.length) return;
    const updated = [...formData.benefits];
    const temp = updated[idx];
    updated[idx] = updated[newIdx];
    updated[newIdx] = temp;
    setFormData({ ...formData, benefits: updated });
  };

  // Filtered Plans
  const filteredPlans = plans.filter((p) => {
    if (activeTab === "published" && p.status !== "published") return false;
    if (activeTab === "draft" && p.status !== "draft") return false;
    if (activeTab === "archived" && p.status !== "archived") return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.plan_code && p.plan_code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const publishedCount = plans.filter((p) => p.status === "published").length;
  const draftCount = plans.filter((p) => p.status === "draft").length;
  const archivedCount = plans.filter((p) => p.status === "archived").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-bounce ${
            toastMessage.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          {toastMessage.type === "error" ? <FiAlertTriangle /> : <FiCheckCircle />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-current opacity-60 hover:opacity-100">
            <FiX />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Single Source of Truth
            </span>
            <span className="text-xs text-text-muted">| Version-Safe Plan Engine</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Distributor Plan & Territory Management
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Configure dynamic distributor tiers, exclusive district allocations, sub-dealer seat quotas, and plan-driven dashboard permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadPlans}
            title="Refresh Plans"
            className="p-2.5 rounded-xl border border-border bg-background hover:bg-surface text-text-secondary hover:text-text-primary transition-all shadow-xs cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1F8F4E] hover:bg-[#18733E] text-white shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiPlus size={16} className="text-white" /> Create Distributor Plan
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-text-muted uppercase">Total Plans</div>
            <div className="text-2xl font-black text-text-primary font-heading mt-0.5">{plans.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <FiLayers size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-text-muted uppercase">Live Published</div>
            <div className="text-2xl font-black text-emerald-600 font-heading mt-0.5">{publishedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <FiCheckCircle size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-text-muted uppercase">Drafts & Staging</div>
            <div className="text-2xl font-black text-amber-600 font-heading mt-0.5">{draftCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <FiEdit2 size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-text-muted uppercase">Archived Plans</div>
            <div className="text-2xl font-black text-text-secondary font-heading mt-0.5">{archivedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <FiShield size={20} />
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: `All Plans (${plans.length})` },
            { id: "published", label: `Published (${publishedCount})` },
            { id: "draft", label: `Drafts (${draftCount})` },
            { id: "archived", label: `Archived (${archivedCount})` },
            { id: "territory_allocations", label: "Territory Allocations & Conflicts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#1F8F4E] text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:text-text-primary hover:bg-surface/80 border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "territory_allocations" && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plans by code, name..."
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-emerald-600"
            />
          </div>
        )}
      </div>

      {/* Territory Allocations View */}
      {activeTab === "territory_allocations" ? (
        <div className="bg-surface rounded-3xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-text-primary">
                National Territory Exclusivity Registry
              </h3>
              <p className="text-xs text-text-secondary">
                Track active revenue districts, detect exclusivity conflicts, and execute authorized overrides.
              </p>
            </div>
            <button
              onClick={loadTerritories}
              className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-background flex items-center gap-1.5 cursor-pointer"
            >
              <FiRefreshCw className={loadingTerritories ? "animate-spin" : ""} /> Refresh Registry
            </button>
          </div>

          {territories.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              No active territory assignments found. Active distributors with assigned districts will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted uppercase text-[10px]">
                    <th className="py-3 px-4">Distributor</th>
                    <th className="py-3 px-4">State / UT</th>
                    <th className="py-3 px-4">Revenue District</th>
                    <th className="py-3 px-4">Exclusivity</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {territories.map((t) => (
                    <tr key={t.id} className="hover:bg-background/50">
                      <td className="py-3 px-4 font-bold text-text-primary">{t.business_name}</td>
                      <td className="py-3 px-4">{t.state}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{t.district}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {t.is_exclusive ? "Exclusive Lock" : "Non-Exclusive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{t.assignment_source || "Onboarding"}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Plans Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {loading ? (
            [1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-3xl bg-surface border border-border animate-pulse" />
            ))
          ) : filteredPlans.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-surface rounded-3xl border border-border space-y-3">
              <FiLayers className="w-10 h-10 text-text-muted mx-auto" />
              <div className="text-base font-bold text-text-primary">No Distributor Plans Found</div>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No plans match the selected filter. Click below to create your first dynamic distributor plan tier.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1F8F4E] hover:bg-[#18733E] text-white shadow-md inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <FiPlus size={16} /> Create Distributor Plan
              </button>
            </div>
          ) : (
            filteredPlans.map((p) => (
              <div
                key={p.id || p.plan_code}
                className={`p-6 rounded-3xl bg-surface border transition-all flex flex-col justify-between relative group hover:shadow-lg ${
                  p.is_popular
                    ? "border-2 border-emerald-500 shadow-sm"
                    : "border-border hover:border-emerald-500/40"
                }`}
              >
                {/* Popular Badge */}
                {p.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-900 shadow-xs flex items-center gap-1">
                    <FiStar className="fill-current text-slate-900" size={10} /> {p.badge_text || "Most Popular Distributor Plan"}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Top Status and Territory Tag */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      {p.allowed_territories_count} {p.territory_type || p.territory_level} ({p.is_territory_exclusive ? "Exclusive" : "Shared"})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-text-muted bg-background px-2 py-0.5 rounded border border-border">
                        v{p.current_version || 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          p.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : p.status === "draft"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        }`}
                      >
                        {p.status ? p.status.toUpperCase() : "ACTIVE"}
                      </span>
                    </div>
                  </div>

                  {/* Plan Name & Descriptions */}
                  <div>
                    <h3 className="font-heading font-black text-xl text-text-primary">{p.name}</h3>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                      {p.short_description || p.description}
                    </p>
                  </div>

                  {/* Price Banner */}
                  <div className="p-4 rounded-2xl bg-background border border-border flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-text-muted uppercase">Joining Fee</div>
                      <div className="font-heading font-black text-2xl text-[#1F8F4E]">
                        ₹{(p.joining_fee_inr || 25000).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-text-muted">
                      <div>Validity: <strong className="text-text-primary">{p.validity_display || `${p.validity_value} months`}</strong></div>
                      <div>Renewal: <strong className="text-text-primary">₹{(p.renewal_fee_inr || 10000).toLocaleString('en-IN')}</strong></div>
                    </div>
                  </div>

                  {/* Key Limits & Features */}
                  <div className="space-y-2 text-xs border-t border-border pt-3">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FiCheck className="text-emerald-500 shrink-0" />
                      <span>Max Sub-Dealers: <strong className="text-text-primary">{p.max_dealers ? `${p.max_dealers} Accounts` : "Unlimited"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FiCheck className="text-emerald-500 shrink-0" />
                      <span>Margin Slab: <strong className="text-text-primary">{p.distributor_margin_slab_min || 8}% – {p.distributor_margin_slab_max || 14}%</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FiCheck className="text-emerald-500 shrink-0" />
                      <span>Active Subscribers: <strong className="text-text-primary">{p.subscribers_count || 0} Distributors</strong></span>
                    </div>
                  </div>

                  {/* Benefits Pill Snippet */}
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <div className="text-[10px] font-bold text-text-muted uppercase">Configured Benefits:</div>
                    <ul className="space-y-1 text-[11px] text-text-secondary max-h-24 overflow-y-auto">
                      {p.benefits?.slice(0, 3).map((b, bi) => (
                        <li key={bi} className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{b}</span>
                        </li>
                      ))}
                      {p.benefits?.length > 3 && (
                        <li className="text-[10px] text-text-muted font-semibold">
                          + {p.benefits.length - 3} more dynamic benefits
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                    <span>Code: {p.plan_code}</span>
                    <span>Order: {p.sort_order}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 hover:bg-[#1F8F4E] hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Edit Plan"
                    >
                      <FiEdit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleOpenPreview(p)}
                      className="py-2 rounded-xl text-xs font-bold bg-background hover:bg-surface border border-border text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Live Preview"
                    >
                      <FiEye size={13} /> Preview
                    </button>
                    <button
                      onClick={() => handleDuplicatePlan(p)}
                      className="py-2 rounded-xl text-xs font-bold bg-background hover:bg-surface border border-border text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Duplicate as Draft"
                    >
                      <FiCopy size={13} /> Clone
                    </button>
                    <button
                      onClick={() => handleViewVersions(p)}
                      className="py-2 rounded-xl text-xs font-bold bg-background hover:bg-surface border border-border text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Version History"
                    >
                      <FiClock size={13} /> v{p.current_version || 1}
                    </button>
                  </div>

                  {/* Status Toggle buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {p.status === "draft" ? (
                      <button
                        onClick={() => handleSetStatus(p, "published")}
                        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 transition-all cursor-pointer"
                      >
                        Publish Live
                      </button>
                    ) : p.status === "published" ? (
                      <button
                        onClick={() => handleSetStatus(p, "unpublished")}
                        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 transition-all cursor-pointer"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetStatus(p, "published")}
                        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500/20 transition-all cursor-pointer"
                      >
                        Restore & Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* ── PLAN EDITOR MODAL ───────────────────────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-background/50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {editingPlanId ? "Edit Plan (Version-Safe)" : "Create New Distributor Plan"}
                </span>
                <h2 className="font-heading font-black text-xl text-text-primary mt-1">
                  {formData.name || "Untitled Distributor Plan"}
                </h2>
              </div>
              <button
                onClick={() => setShowEditorModal(false)}
                className="p-2 rounded-full hover:bg-surface text-text-muted hover:text-text-primary cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Editor Subtabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-border overflow-x-auto bg-surface shrink-0">
              {[
                { id: "basic", label: "1. Identity & Details" },
                { id: "commercials", label: "2. Fees, GST & Billing" },
                { id: "territory", label: "3. Territory Scope" },
                { id: "dealers", label: "4. Dealer Network" },
                { id: "margins", label: "5. Margins & Catalogue" },
                { id: "benefits", label: "6. Dynamic Benefits" },
                { id: "modules", label: "7. Dashboard Modules" },
                { id: "limits", label: "8. Limits & Orders" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEditorActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    editorActiveTab === tab.id
                      ? "border-[#1F8F4E] text-[#1F8F4E]"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Tab 1: Identity */}
              {editorActiveTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Plan Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. District Distributor Tier (Starter)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Plan Code / Slug *</label>
                      <input
                        type="text"
                        required
                        value={formData.plan_code}
                        onChange={(e) => setFormData({ ...formData, plan_code: e.target.value.toUpperCase() })}
                        placeholder="e.g. BK-DIST-STARTER"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border font-mono text-text-primary focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-text-primary block mb-1">Short Description (Card Teaser)</label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      placeholder="One-line summary for plan cards"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-text-primary block mb-1">Full Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed breakdown of distributor rights and commercial scope..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Most Popular Badge</div>
                        <div className="text-[10px] text-text-muted">Highlight with gold badge</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.is_popular}
                        onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Badge Label Text</label>
                      <input
                        type="text"
                        value={formData.badge_text}
                        onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                        placeholder="Most Popular Distributor Plan"
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Display Sort Order</label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Commercials */}
              {editorActiveTab === "commercials" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Distributor Joining Fee (₹ INR) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-text-muted font-bold">₹</span>
                        <input
                          type="number"
                          required
                          value={formData.joining_fee_inr}
                          onChange={(e) => setFormData({ ...formData, joining_fee_inr: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Annual Renewal Fee (₹ INR) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-text-muted font-bold">₹</span>
                        <input
                          type="number"
                          required
                          value={formData.renewal_fee_inr}
                          onChange={(e) => setFormData({ ...formData, renewal_fee_inr: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Statutory GST Rate (%)</label>
                      <input
                        type="number"
                        value={formData.tax_rate_percent}
                        onChange={(e) => setFormData({ ...formData, tax_rate_percent: parseFloat(e.target.value) || 18 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">GST HSN / SAC Code</label>
                      <input
                        type="text"
                        value={formData.gst_hsn_code}
                        onChange={(e) => setFormData({ ...formData, gst_hsn_code: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Billing Frequency</label>
                      <select
                        value={formData.billing_type}
                        onChange={(e) => setFormData({ ...formData, billing_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      >
                        <option value="annual_recurring">Annual Recurring</option>
                        <option value="one_time">One-Time Fee</option>
                        <option value="monthly">Monthly Subscription</option>
                        <option value="quarterly">Quarterly Subscription</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Plan Validity</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.validity_value}
                          onChange={(e) => setFormData({ ...formData, validity_value: parseInt(e.target.value, 10) || 12 })}
                          className="w-20 px-3 py-2 rounded-xl bg-background border border-border text-text-primary"
                        />
                        <select
                          value={formData.validity_unit}
                          onChange={(e) => setFormData({ ...formData, validity_unit: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-text-primary"
                        >
                          <option value="months">Months</option>
                          <option value="days">Days</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Grace Period (Days)</label>
                      <input
                        type="number"
                        value={formData.grace_period_days}
                        onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value, 10) || 15 })}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Auto-Renewal</div>
                        <div className="text-[10px] text-text-muted">Auto-charge recurring fee</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.auto_renew}
                        onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Territory Scope */}
              {editorActiveTab === "territory" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Territory Allocation Type *</label>
                      <select
                        value={formData.territory_type}
                        onChange={(e) => setFormData({ ...formData, territory_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      >
                        <option value="district">Single Revenue District</option>
                        <option value="multiple_districts">Multiple Revenue Districts</option>
                        <option value="state">Entire State / UT Master Hub</option>
                        <option value="region">Regional Cluster</option>
                        <option value="custom">Custom Multi-City Matrix</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Number of Territories Allowed *</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.allowed_territories_count}
                        onChange={(e) => setFormData({ ...formData, allowed_territories_count: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                    <div>
                      <div className="font-bold text-text-primary">Guaranteed Territorial Exclusivity</div>
                      <div className="text-[10px] text-text-muted">
                        Geo-locks revenue district against all competing distributors in this territory.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.is_territory_exclusive}
                      onChange={(e) => setFormData({ ...formData, is_territory_exclusive: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Dealer Network */}
              {editorActiveTab === "dealers" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Maximum Sub-Dealer Seats *</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.max_dealers}
                        onChange={(e) => setFormData({ ...formData, max_dealers: parseInt(e.target.value, 10) || 0 })}
                        placeholder="e.g. 15 (0 or empty = unlimited)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold"
                      />
                      <span className="text-[10px] text-text-muted mt-1 block">
                        Maximum number of authorized dealers this distributor can onboard.
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Dealer Onboarding Allowed</div>
                        <div className="text-[10px] text-text-muted">Distributor can invite sub-dealers</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.can_onboard_dealers}
                        onChange={(e) => setFormData({ ...formData, can_onboard_dealers: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Direct Dealer Activation</div>
                        <div className="text-[10px] text-text-muted">Distributor can activate dealers without admin signoff</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.dealer_direct_activation}
                        onChange={(e) => setFormData({ ...formData, dealer_direct_activation: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Custom Dealer Pricing Permission</div>
                        <div className="text-[10px] text-text-muted">Distributor can override dealer margin markup</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.dealer_pricing_permission}
                        onChange={(e) => setFormData({ ...formData, dealer_pricing_permission: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Margins & Catalogue */}
              {editorActiveTab === "margins" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Pricing Tier Name</label>
                      <input
                        type="text"
                        value={formData.pricing_tier}
                        onChange={(e) => setFormData({ ...formData, pricing_tier: e.target.value })}
                        placeholder="e.g. Tier-1 Wholesale Slab"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Distributor Margin Slab Min (%)</label>
                      <input
                        type="number"
                        value={formData.distributor_margin_slab_min}
                        onChange={(e) => setFormData({ ...formData, distributor_margin_slab_min: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Distributor Margin Slab Max (%)</label>
                      <input
                        type="number"
                        value={formData.distributor_margin_slab_max}
                        onChange={(e) => setFormData({ ...formData, distributor_margin_slab_max: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Catalogue Access Mode</label>
                      <select
                        value={formData.product_access_type}
                        onChange={(e) => setFormData({ ...formData, product_access_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      >
                        <option value="all">Full BOS Component Whitelist (All Products)</option>
                        <option value="whitelisted_only">Whitelisted Category IDs Only</option>
                        <option value="tier_based">Tier-Specific Catalogue</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">MRP & MSRP Visibility</div>
                        <div className="text-[10px] text-text-muted">Distributor can see official retail MRP</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.can_see_mrp}
                        onChange={(e) => setFormData({ ...formData, can_see_mrp: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Dynamic Benefits Builder */}
              {editorActiveTab === "benefits" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-background border border-border space-y-2">
                    <label className="font-bold text-text-primary block">Add New Benefit to Plan Card</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBenefitInput}
                        onChange={(e) => setNewBenefitInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit(); } }}
                        placeholder="e.g. 24/7 Priority Factory Dispatch SLA..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddBenefit}
                        className="px-5 py-2.5 rounded-xl bg-[#1F8F4E] hover:bg-[#18733E] text-white font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <FiPlus /> Add Benefit
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-text-primary">Configured Plan Benefits ({formData.benefits.length})</div>
                    {formData.benefits.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 group hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <FiCheck className="text-emerald-500 shrink-0" />
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => {
                              const updated = [...formData.benefits];
                              updated[idx] = e.target.value;
                              setFormData({ ...formData, benefits: updated });
                            }}
                            className="bg-transparent border-none text-xs text-text-primary font-medium focus:outline-none focus:bg-surface rounded px-2 py-1 flex-1"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBenefit(idx, -1)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <FiArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formData.benefits.length - 1}
                            onClick={() => handleMoveBenefit(idx, 1)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <FiArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveBenefit(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                            title="Remove Benefit"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 7: Dashboard Modules Permissions */}
              {editorActiveTab === "modules" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-text-primary">Plan-Specific Dashboard Module Permissions</h4>
                    <p className="text-[11px] text-text-muted">
                      Select which distributor portal modules will be unlocked for subscribers on this plan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {[
                      { key: "overview", label: "Dashboard Overview", desc: "KPI widgets & summary" },
                      { key: "territories", label: "Assigned Territories", desc: "District map & geo-lock" },
                      { key: "catalogue", label: "Product Catalogue", desc: "BOS kit & component store" },
                      { key: "pricing", label: "Distributor Pricing", desc: "Wholesale margin ledger" },
                      { key: "inventory", label: "Inventory Reservation", desc: "Warehouse stock lock" },
                      { key: "orders", label: "Orders & Fulfillment", desc: "Procurement order tracking" },
                      { key: "customers", label: "Customer Directory", desc: "Local territory accounts" },
                      { key: "dealers", label: "Dealer Management", desc: "Sub-dealer roster" },
                      { key: "dealer_onboarding", label: "Dealer Onboarding", desc: "Invite & approve dealers" },
                      { key: "leads", label: "Leads & Referrals", desc: "Regional solar leads" },
                      { key: "sales_reports", label: "Sales Reports", desc: "Volume & capacity charts" },
                      { key: "margin_reports", label: "Margin Ledgers", desc: "Channel margin & GST" },
                      { key: "documents", label: "Agreements & KYC", desc: "Statutory dossiers" },
                      { key: "support", label: "Dedicated Support", desc: "Direct escalation desk" },
                      { key: "subscriptions", label: "Plan & Renewals", desc: "Upgrade & seat quotas" },
                    ].map((mod) => (
                      <label
                        key={mod.key}
                        className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition-all ${
                          formData.dashboard_modules[mod.key]
                            ? "bg-emerald-500/5 border-emerald-500/40 text-text-primary shadow-xs"
                            : "bg-background border-border text-text-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!formData.dashboard_modules[mod.key]}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              dashboard_modules: {
                                ...formData.dashboard_modules,
                                [mod.key]: e.target.checked,
                              },
                            });
                          }}
                          className="mt-0.5 text-emerald-600 rounded"
                        />
                        <div>
                          <div className="font-bold text-xs">{mod.label}</div>
                          <div className="text-[10px] opacity-70">{mod.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 8: Order Limits */}
              {editorActiveTab === "limits" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Minimum Order Value (₹ INR)</label>
                      <input
                        type="number"
                        value={formData.min_order_value_inr}
                        onChange={(e) => setFormData({ ...formData, min_order_value_inr: parseFloat(e.target.value) || 0 })}
                        placeholder="0 = No minimum"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Distributor Credit Limit (₹ INR)</label>
                      <input
                        type="number"
                        value={formData.credit_limit_inr}
                        onChange={(e) => setFormData({ ...formData, credit_limit_inr: parseFloat(e.target.value) || 0 })}
                        placeholder="0 = Strict Advance Payment"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Warehouse Stock Hold Hours</label>
                      <input
                        type="number"
                        value={formData.stock_reservation_hours}
                        onChange={(e) => setFormData({ ...formData, stock_reservation_hours: parseInt(e.target.value, 10) || 48 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Monthly Lead Referral Quota</label>
                      <input
                        type="number"
                        value={formData.leads_per_month}
                        onChange={(e) => setFormData({ ...formData, leads_per_month: parseInt(e.target.value, 10) || 25 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between shrink-0 bg-background/50">
              <button
                type="button"
                onClick={() => handleOpenPreview(formData)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text-secondary hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
              >
                <FiEye /> Live Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePlan}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-[#1F8F4E] hover:bg-[#18733E] text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FiCheck /> {saving ? "Saving..." : editingPlanId ? "Save & Create Version" : "Create & Publish Plan"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* ── LIVE PREVIEW MODAL ─────────────────────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showPreviewModal && previewPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-border flex items-center justify-between bg-background">
              <div className="flex items-center gap-3">
                <span className="font-heading font-black text-sm text-text-primary">Live Plan & Dashboard Preview</span>
                <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border text-xs">
                  <button
                    onClick={() => setPreviewMode("card")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewMode === "card" ? "bg-[#1F8F4E] text-white" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Public Card View
                  </button>
                  <button
                    onClick={() => setPreviewMode("dashboard")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewMode === "dashboard" ? "bg-[#1F8F4E] text-white" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Distributor Dashboard View
                  </button>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 text-text-muted hover:text-text-primary cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-background flex items-center justify-center">
              {previewMode === "card" ? (
                /* Public Website Card Simulation */
                <div
                  className={`w-full max-w-sm rounded-3xl p-8 bg-white border flex flex-col justify-between relative shadow-xl ${
                    previewPlan.is_popular ? "border-2 border-emerald-500" : "border-slate-200"
                  }`}
                >
                  {previewPlan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 shadow-sm">
                      {previewPlan.badge_text || "Most Popular Distributor Plan"}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-heading font-black text-2xl text-slate-900">{previewPlan.name || "Distributor Plan"}</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {previewPlan.short_description || previewPlan.description || "Core regional distribution tier with exclusive territorial rights."}
                      </p>
                    </div>

                    <div className="pt-3 pb-5 border-y border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-slate-500 font-medium">Joining Fee:</span>
                        <span className="font-heading font-black text-3xl text-emerald-600">
                          ₹{(previewPlan.joining_fee_inr || 25000).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>Renewal: <strong className="text-slate-800">₹{(previewPlan.renewal_fee_inr || 10000).toLocaleString('en-IN')}</strong></span>
                        <span>Validity: <strong className="text-slate-800">{previewPlan.validity_display || `${previewPlan.validity_value || 12} Months`}</strong></span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Territory: <strong className="text-slate-700">{previewPlan.allowed_territories_count || 1} {previewPlan.territory_type || 'District'} ({previewPlan.is_territory_exclusive ? 'Exclusive Lock' : 'Shared'})</strong>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wider">Included Privileges:</h4>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {previewPlan.benefits?.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2">
                            <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      className="w-full py-3.5 rounded-xl text-center text-sm font-bold bg-[#1F8F4E] text-white shadow-sm flex items-center justify-center gap-2 hover:bg-[#18733E] cursor-pointer"
                    >
                      Select Plan & Onboard →
                    </button>
                  </div>
                </div>
              ) : (
                /* Distributor Portal Simulation */
                <div className="w-full max-w-lg bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="font-heading font-bold text-base text-text-primary">
                      Subscriber Console: {previewPlan.name}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                      Entitlement Matrix
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-text-primary">Unlocked Dashboard Modules:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(previewPlan.dashboard_modules || {}).map(([mod, enabled]) => (
                        <div
                          key={mod}
                          className={`p-2 rounded-lg border flex items-center gap-2 ${
                            enabled
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                              : "bg-background border-border text-text-muted opacity-40 line-through"
                          }`}
                        >
                          {enabled ? <FiCheck size={12} /> : <FiX size={12} />}
                          <span className="capitalize">{mod.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* ── VERSION HISTORY MODAL ───────────────────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between bg-background">
              <div>
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Version History: {versionPlanName}
                </h3>
                <p className="text-[11px] text-text-muted">
                  Immutable plan snapshots preserved across distributor subscription lifecycles.
                </p>
              </div>
              <button onClick={() => setShowVersionsModal(false)} className="p-2 text-text-muted hover:text-text-primary cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {selectedPlanVersions.length === 0 ? (
                <div className="py-8 text-center text-text-muted">No published snapshots available yet.</div>
              ) : (
                selectedPlanVersions.map((v) => (
                  <div key={v.id || v._id} className="p-4 rounded-2xl bg-background border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-sm text-text-primary">
                        Version {v.version_number}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Published: {new Date(v.created_at || v.published_at || Date.now()).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-text-secondary pt-1">
                      <div>Fee: <strong>₹{Math.round((v.snapshot?.joining_fee_paise || 0) / 100).toLocaleString('en-IN')}</strong></div>
                      <div>Dealers: <strong>{v.snapshot?.max_dealers || 15}</strong></div>
                      <div>Territory: <strong>{v.snapshot?.territory_type || 'district'}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
