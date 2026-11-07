/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiCreditCard,
  FiPercent,
  FiClock,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiPackage,
  FiArrowRight,
  FiRefreshCw,
  FiSliders,
  FiSearch,
  FiZap,
  FiRotateCcw,
} from "react-icons/fi";
import { FaSolarPanel, FaBolt, FaChevronDown } from "react-icons/fa";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;

const DEFAULT_STAGES = [
  { sequence: 1, stage_number: 1, stage_key: "CONFIRMED", stage_name: "Confirmed (Payment Verified)", tat_days: 1, tat_hours: 24, description: "Advance Payment Verified by Accounts" },
  { sequence: 2, stage_number: 2, stage_key: "PROCESSING", stage_name: "Processing (Picking & Packing)", tat_days: 2, tat_hours: 48, description: "Warehouse BOM picking & packing" },
  { sequence: 3, stage_number: 3, stage_key: "VEHICLE_ASSIGNED", stage_name: "Vehicle Assigned", tat_days: 1, tat_hours: 24, description: "Vehicle & driver allocated to route" },
  { sequence: 4, stage_number: 4, stage_key: "READY_FOR_DISPATCH", stage_name: "Ready for Dispatch / Before Dispatch", tat_days: 2, tat_hours: 48, description: "Staged at gate; Remaining Payment verified before release" },
  { sequence: 5, stage_number: 5, stage_key: "DISPATCHED", stage_name: "Dispatched", tat_days: 1, tat_hours: 12, description: "Vehicle gate exit from warehouse" },
  { sequence: 6, stage_number: 6, stage_key: "IN_TRANSIT", stage_name: "In Transit", tat_days: 3, tat_hours: 72, description: "Carrier movement to destination" },
  { sequence: 7, stage_number: 7, stage_key: "REACHED_DESTINATION", stage_name: "Reached Destination", tat_days: 1, tat_hours: 12, description: "Arrived at delivery location" },
  { sequence: 8, stage_number: 8, stage_key: "DELIVERED", stage_name: "Delivered", tat_days: 1, tat_hours: 6, description: "Sign-off and customer handover completed" },
];

const DEFAULT_MILESTONES = [
  {
    milestone_number: 1,
    title: "Milestone 1 — Advance Payment",
    percentage: 30,
    stage_key: "order_placement",
    stage_label: "Advance Payment at Order Placement",
    description: "Pay 30% advance to confirm order and initiate procurement/assembly.",
    payment_proof_required: true,
    allows_dispatch: false,
  },
  {
    milestone_number: 2,
    title: "Milestone 2 — Final Payment",
    percentage: 70,
    stage_key: "before_dispatch",
    stage_label: "Before Dispatch",
    description: "Pay remaining 70% balance before materials are dispatched from warehouse.",
    payment_proof_required: true,
    allows_dispatch: true,
  },
];

export default function PaymentMilestoneSettings() {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const [kits, setKits] = useState([]);
  const [defaultPolicy, setDefaultPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ── Quick Filters State (Matching Screenshot) ─────────────────────────────
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  const [hierarchy, setHierarchy] = useState({
    shopHierarchy: [],
    industries: [],
    categories: [],
    subcategories: [],
    types: [],
    ranges: [],
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all"); // 'all' | 'custom' | 'default'

  // Modal / Configuration State
  const [showModal, setShowModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null); // null if editing Global Default
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [stagesConfig, setStagesConfig] = useState(DEFAULT_STAGES);

  // Calculate total milestone %
  const totalPercentage = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
  }, [milestones]);

  const isValidPercentage = Math.abs(totalPercentage - 100) < 0.01;

  // Load All ComboKits and their Milestone Configurations
  const loadKitsAndMilestones = async () => {
    setLoading(true);
    const countryParam = countryName ? `?country=${encodeURIComponent(countryName)}` : "";
    try {
      // 1. Fast unified kits-overview endpoint (<30ms)
      try {
        const res = await axios.get(`${ADMIN_API}/payment-milestones/kits-overview${countryParam}`, {
          headers: authHeaderObj(),
          timeout: 6000,
        });

        if (res.data?.success && Array.isArray(res.data.data?.kits)) {
          setKits(res.data.data.kits);
          setDefaultPolicy(res.data.data.default_policy);
          if (res.data.data?.hierarchy) {
            setHierarchy(res.data.data.hierarchy);
          }
          return; // Finally block will execute and setLoading(false)
        }
      } catch (err) {
        console.warn("Primary kits-overview endpoint fallback:", err.message);
      }

      // 2. Fallback: Fetch kits and configs independently
      const countryPath = countryName?.toLowerCase() === "india" ? "/india" : (countryName ? `/${countryName}` : "/india");
      const [kitsRes, configsRes] = await Promise.all([
        axios.get(
          `${ADMIN_API}/combo-kits${countryPath}/get-kits?unique_id=ADM_COMBO_KITS&req_for=view&is_custom=false`,
          { headers: authHeaderObj(), timeout: 6000 }
        ).catch(() => ({ data: { data: [] } })),
        axios.get(`${ADMIN_API}/payment-milestones/list`, {
          headers: authHeaderObj(),
          timeout: 6000,
        }).catch(() => ({ data: { data: [] } })),
      ]);

      const rawKits = kitsRes.data?.data || kitsRes.data?.kits || (Array.isArray(kitsRes.data) ? kitsRes.data : []);
      const rawConfigs = configsRes.data?.data || [];

      const defConfig = rawConfigs.find((c) => c.is_default) || null;
      setDefaultPolicy(defConfig);

      const configMap = new Map();
      rawConfigs.forEach((c) => {
        if (!c.is_default && c.kit_id) {
          const kitId = String(c.kit_id._id || c.kit_id);
          configMap.set(kitId, c);
        }
      });

      const merged = rawKits.map((k) => {
        const idStr = String(k._id || k.id);
        const cfg = configMap.get(idStr);
        const hasCustom = Boolean(cfg && cfg.is_active);
        const effective = cfg?.milestones || defConfig?.milestones || DEFAULT_MILESTONES;
        const m1 = effective.find((m) => m.milestone_number === 1) || { percentage: 30 };
        const m2 = effective.find((m) => m.milestone_number === 2) || { percentage: 70 };

        return {
          kit_id: k._id || k.id,
          id: k._id || k.id,
          name: k.name || k.title || k.kit_name || "Solar Kit",
          capacity: k.capacity || k.system_size || 5,
          image: k.kit_image || k.image,
          has_custom_rule: hasCustom,
          custom_config: cfg || null,
          advance_percentage: Number(m1.percentage) || 30,
          balance_percentage: Number(m2.percentage) || 70,
          milestones: effective,
          order_stages_config: cfg?.order_stages_config || defConfig?.order_stages_config || DEFAULT_STAGES,
          industryType: k.industryType || "Solar PV",
          category: k.category || null,
          subCategory: k.subCategory || null,
          systemType: k.systemType || k.system_type || "On-Grid",
          projectRange: k.projectRange || null,
        };
      });

      setKits(merged);
    } catch (fallbackErr) {
      console.error("Error loading kits and milestones:", fallbackErr);
      setMsg({ type: "error", text: "Failed to load ComboKits. Please refresh." });
    } finally {
      setLoading(false);
    }
  };

  // Fallback hierarchy loading if not provided by overview
  const fetchHierarchy = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/delivery-management/hierarchy-options`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data.data) {
        setHierarchy(res.data.data);
      }
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    loadKitsAndMilestones();
    fetchHierarchy();
  }, [countryName]);

  // ── Cascading Quick Filter Options ────────────────────────────────────────
  const shopHierarchy = useMemo(() => hierarchy.shopHierarchy || [], [hierarchy.shopHierarchy]);

  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    } else if (hierarchy?.industries && hierarchy.industries.length > 0) {
      hierarchy.industries.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    }
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, hierarchy]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds =
        quickFilters.industryType === "all"
          ? shopHierarchy
          : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
          }
        });
      });
    } else if (hierarchy?.categories && hierarchy.categories.length > 0) {
      hierarchy.categories.forEach((cat) => {
        if (cat.name && !catMap.has(cat.name.toLowerCase())) {
          catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
        }
      });
    }
    return [{ value: "all", text: "All Categories" }, ...Array.from(catMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds =
        quickFilters.industryType === "all"
          ? shopHierarchy
          : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
              }
            });
          }
        });
      });
    } else if (hierarchy?.subcategories && hierarchy.subcategories.length > 0) {
      hierarchy.subcategories.forEach((sub) => {
        if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
          subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
        }
      });
    }
    return [{ value: "all", text: "All Sub-Categories" }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds =
        quickFilters.industryType === "all"
          ? shopHierarchy
          : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
                String(sub.id) === String(quickFilters.subCategory)
              ) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                    typesMap.set(mt.name.toLowerCase(), { value: mt.name, text: mt.name });
                  }
                });
              }
            });
          }
        });
      });
    } else if (hierarchy?.types && hierarchy.types.length > 0) {
      hierarchy.types.forEach((t) => {
        if (t.name && !typesMap.has(t.name.toLowerCase())) {
          typesMap.set(t.name.toLowerCase(), { value: t.name, text: t.name });
        }
      });
    }
    return [{ value: "all", text: "All System Types" }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const rangesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds =
        quickFilters.industryType === "all"
          ? shopHierarchy
          : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
                String(sub.id) === String(quickFilters.subCategory)
              ) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (
                    quickFilters.systemType === "all" ||
                    mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                    String(mt.id || mt.type_id) === String(quickFilters.systemType)
                  ) {
                    (mt.ranges || []).forEach((r) => {
                      const label =
                        r.range_label ||
                        (r.min_value !== undefined ? `${r.min_value} - ${r.max_value} kW` : null);
                      if (label && !rangesMap.has(label.toLowerCase())) {
                        rangesMap.set(label.toLowerCase(), { value: label, text: label });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    } else if (hierarchy?.ranges && hierarchy.ranges.length > 0) {
      hierarchy.ranges.forEach((r) => {
        const label =
          r.range_label || (r.min_value !== undefined ? `${r.min_value} - ${r.max_value} kW` : null);
        if (label && !rangesMap.has(label.toLowerCase())) {
          rangesMap.set(label.toLowerCase(), { value: label, text: label });
        }
      });
    }
    return [{ value: "all", text: "All Project Ranges" }, ...Array.from(rangesMap.values())];
  }, [
    shopHierarchy,
    hierarchy,
    quickFilters.industryType,
    quickFilters.category,
    quickFilters.subCategory,
    quickFilters.systemType,
  ]);

  // Check if any quick filter is active
  const hasActiveQuickFilters = useMemo(() => {
    return (
      quickFilters.industryType !== "all" ||
      quickFilters.category !== "all" ||
      quickFilters.subCategory !== "all" ||
      quickFilters.systemType !== "all" ||
      quickFilters.projectRange !== "all"
    );
  }, [quickFilters]);

  // Clear Quick Filters (matching "Clear Main" in screenshot)
  const clearQuickFilters = () => {
    setQuickFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
  };

  // Configure a specific ComboKit
  const handleConfigureKit = (kit) => {
    setSelectedKit(kit);
    setIsDefault(false);

    if (kit.custom_config) {
      setEditingId(kit.custom_config._id || kit.custom_config.id);
      setRuleName(kit.custom_config.rule_name || `${kit.name} Milestone Policy`);
      setDescription(kit.custom_config.description || "");
      setIsActive(kit.custom_config.is_active !== false);
      setMilestones(kit.custom_config.milestones || DEFAULT_MILESTONES);
      setStagesConfig(kit.custom_config.order_stages_config || DEFAULT_STAGES);
    } else {
      setEditingId(null);
      setRuleName(`${kit.name} Milestone Policy`);
      setDescription(`Payment milestone & advance clearance policy for ${kit.name}.`);
      setIsActive(true);
      setMilestones(defaultPolicy?.milestones || DEFAULT_MILESTONES);
      setStagesConfig(defaultPolicy?.order_stages_config || DEFAULT_STAGES);
    }

    setShowModal(true);
  };

  // Configure Global Default Policy
  const handleConfigureGlobalDefault = () => {
    setSelectedKit(null);
    setIsDefault(true);
    setEditingId(defaultPolicy?._id || defaultPolicy?.id || null);
    setRuleName(defaultPolicy?.rule_name || "Global Default Milestone Policy");
    setDescription(
      defaultPolicy?.description ||
      "Default 30% advance at order placement + 70% before dispatch clearance policy applied to all ComboKits."
    );
    setIsActive(true);
    setMilestones(defaultPolicy?.milestones || DEFAULT_MILESTONES);
    setStagesConfig(defaultPolicy?.order_stages_config || DEFAULT_STAGES);
    setShowModal(true);
  };

  // Milestone Form Handlers
  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleAddMilestone = () => {
    const nextNumber = milestones.length + 1;
    setMilestones([
      ...milestones,
      {
        milestone_number: nextNumber,
        title: `Milestone ${nextNumber}`,
        percentage: 0,
        stage_key: "before_dispatch",
        stage_label: "Before Dispatch",
        description: "",
        payment_proof_required: true,
        allows_dispatch: false,
      },
    ]);
  };

  const handleRemoveMilestone = (index) => {
    if (milestones.length <= 1) {
      alert("At least one payment milestone is required.");
      return;
    }
    const updated = milestones
      .filter((_, i) => i !== index)
      .map((m, idx) => ({ ...m, milestone_number: idx + 1 }));
    setMilestones(updated);
  };

  const handleStageTatChange = (index, tatValue) => {
    const updated = [...stagesConfig];
    const hrs = Number(tatValue) || 0;
    updated[index].tat_hours = hrs;
    updated[index].tat_days = Math.max(1, Math.round(hrs / 24));
    setStagesConfig(updated);
  };

  // Save Configuration
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isValidPercentage) {
      setMsg({
        type: "error",
        text: `Milestone percentages must sum exactly to 100%. Current total: ${totalPercentage}%`,
      });
      return;
    }

    setSaving(true);
    setMsg({ type: "", text: "" });

    const payload = {
      is_default: isDefault,
      kit_id: isDefault ? null : (selectedKit?.kit_id || selectedKit?.id),
      rule_name:
        ruleName.trim() ||
        (isDefault ? "Global Default Milestone Policy" : `${selectedKit?.name || "ComboKit"} Milestone Policy`),
      description: description.trim(),
      milestones,
      order_stages_config: stagesConfig,
      is_active: isActive,
    };

    try {
      let res;
      if (editingId) {
        res = await axios.put(`${ADMIN_API}/payment-milestones/update/${editingId}`, payload, {
          headers: authHeaderObj(),
        });
      } else {
        res = await axios.post(`${ADMIN_API}/payment-milestones/create`, payload, {
          headers: authHeaderObj(),
        });
      }

      if (res.data?.success || res.data?.status === "success") {
        setMsg({
          type: "success",
          text: isDefault
            ? "Global Default Milestone Policy saved successfully!"
            : `Milestones for "${selectedKit?.name || "ComboKit"}" saved successfully!`,
        });
        setShowModal(false);
        loadKitsAndMilestones();
      } else {
        setMsg({ type: "error", text: res.data?.message || "Failed to save configuration." });
      }
    } catch (err) {
      console.error("Save error:", err);
      setMsg({ type: "error", text: err.response?.data?.message || "Error saving milestone configuration." });
    } finally {
      setSaving(false);
    }
  };

  // Revert kit to Global Default Policy
  const handleRevertToDefault = async (kit) => {
    const configId = kit?.custom_config?._id || kit?.custom_config?.id;
    if (!configId) return;

    if (!window.confirm(`Reset "${kit.name}" to use the Global Default Policy (30% Adv / 70% Bal)?`)) {
      return;
    }

    try {
      const res = await axios.delete(`${ADMIN_API}/payment-milestones/delete/${configId}`, {
        headers: authHeaderObj(),
      });
      if (res.data?.success || res.data?.status === "success") {
        setMsg({ type: "success", text: `"${kit.name}" reverted to Global Default Policy.` });
        setShowModal(false);
        loadKitsAndMilestones();
      }
    } catch (err) {
      console.error("Revert error:", err);
      setMsg({ type: "error", text: "Failed to reset milestone policy." });
    }
  };

  // Filtered Kits for display
  const filteredKits = useMemo(() => {
    return kits.filter((k) => {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (k.name || k.kit_name || "").toLowerCase().includes(q);
      const matchCapacity = String(k.capacity || "").toLowerCase().includes(q);
      const matchesSearch = !q || matchName || matchCapacity;

      if (!matchesSearch) return false;

      if (activeFilterTab === "custom" && !k.has_custom_rule) return false;
      if (activeFilterTab === "default" && k.has_custom_rule) return false;

      // ── Cascading Quick Filters ──
      if (quickFilters.industryType !== "all") {
        const val = String(quickFilters.industryType).trim().toLowerCase();
        const kitVal = String(k.industryType || "").trim().toLowerCase();
        if (kitVal !== val) return false;
      }

      if (quickFilters.category !== "all") {
        const val = String(quickFilters.category).trim().toLowerCase();
        const kitVal = String(k.category || "").trim().toLowerCase();
        if (kitVal !== val) return false;
      }

      if (quickFilters.subCategory !== "all") {
        const val = String(quickFilters.subCategory).trim().toLowerCase();
        const kitVal = String(k.subCategory || "").trim().toLowerCase();
        if (kitVal !== val) return false;
      }

      if (quickFilters.systemType !== "all") {
        const val = String(quickFilters.systemType).trim().toLowerCase();
        const kitVal = String(k.systemType || k.system_type || "").trim().toLowerCase();
        if (kitVal !== val) return false;
      }

      if (quickFilters.projectRange !== "all") {
        const val = String(quickFilters.projectRange).trim().toLowerCase();
        const kitVal = String(k.projectRange || "").trim().toLowerCase();
        if (kitVal !== val) return false;
      }

      return true;
    });
  }, [kits, searchQuery, activeFilterTab, quickFilters]);

  const customConfiguredCount = useMemo(() => kits.filter((k) => k.has_custom_rule).length, [kits]);
  const defaultPolicyCount = useMemo(() => kits.filter((k) => !k.has_custom_rule).length, [kits]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header (Notice: No "+ Add Milestone Rule" button as requested) ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1">
            <span>Payment Configuration</span>
            <span>/</span>
            <span className="text-amber-600 font-semibold">Payment Milestones</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <FiCreditCard className="w-6 h-6" />
            </span>
            Product-Wise Payment Milestone Configuration
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            All ComboKits are displayed below in card format. Click on any ComboKit card to view and customize its payment milestones, advance percentages, and order stage turnaround times (TATs).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadKitsAndMilestones}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition active:scale-95"
            title="Refresh ComboKits and Milestone Rules"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Alert Messages ── */}
      {msg.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-sm transition-all ${msg.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-red-50 text-red-800 border border-red-200"
            }`}
        >
          <div className="flex items-center gap-3">
            {msg.type === "success" ? (
              <FiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="font-medium">{msg.text}</span>
          </div>
          <button onClick={() => setMsg({ type: "", text: "" })} className="text-gray-400 hover:text-gray-700">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Global Default Policy Master Card (Hero Section) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-primary/5 border border-amber-500/25 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                <FiSliders size={13} />
                Global Default Policy
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Active Fallback for All ComboKits
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              Standard EPC Payment Policy:{" "}
              <span className="text-amber-600">30% Advance</span> +{" "}
              <span className="text-primary">70% Before Dispatch</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-2xl leading-relaxed">
              This global policy automatically applies to any ComboKit that does not have an individualized milestone override. Advance payment clears procurement & warehouse assembly (generating PI), and the final 70% clears logistics dispatch (generating Tax Invoice).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleConfigureGlobalDefault}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FiSliders size={16} />
              Configure Default Policy
            </button>
          </div>
        </div>
      </div>

      {/* ─── QUICK FILTERS BAR (Matching User Screenshot) ─── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FiPackage className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Quick Filters
              </h3>
              {hasActiveQuickFilters && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  Filtered ({filteredKits.length} {filteredKits.length === 1 ? "kit" : "kits"})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={clearQuickFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer transition-colors"
          >
            Clear Main
          </button>
        </div>

        {/* 5 Cascading Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Industry Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Industry Type
            </label>
            <div className="relative">
              <select
                value={quickFilters.industryType}
                onChange={(e) =>
                  setQuickFilters({
                    industryType: e.target.value,
                    category: "all",
                    subCategory: "all",
                    systemType: "all",
                    projectRange: "all",
                  })
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {industryTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 2. Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="relative">
              <select
                value={quickFilters.category}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                    subCategory: "all",
                    systemType: "all",
                    projectRange: "all",
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 3. Sub Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sub Category
            </label>
            <div className="relative">
              <select
                value={quickFilters.subCategory}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    subCategory: e.target.value,
                    systemType: "all",
                    projectRange: "all",
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {subCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 4. System Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              System Type
            </label>
            <div className="relative">
              <select
                value={quickFilters.systemType}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    systemType: e.target.value,
                    projectRange: "all",
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {systemTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 5. Project Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Project Range
            </label>
            <div className="relative">
              <select
                value={quickFilters.projectRange}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    projectRange: e.target.value,
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {projectRangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search Bar & Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ComboKits by name, capacity (e.g. 3kW, 5kW, residential)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={15} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeFilterTab === "all"
              ? "bg-white text-gray-900 shadow-xs border border-gray-200"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            All ComboKits ({kits.length})
          </button>
          <button
            onClick={() => setActiveFilterTab("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeFilterTab === "custom"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Custom Configured ({customConfiguredCount})
          </button>
          <button
            onClick={() => setActiveFilterTab("default")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeFilterTab === "default"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Using Default ({defaultPolicyCount})
          </button>
        </div>
      </div>

      {/* ── ComboKit Cards Grid (User Request: "sari combokit fetch hogi and vo sab card format me aayegi and us par click karke configuration karna hoga") ── */}
      {loading && kits.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3.5 animate-pulse shadow-xs">
              <div className="h-44 bg-gray-200 rounded-xl w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-12 bg-gray-100 rounded-xl" />
              <div className="h-9 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="py-20 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <FiPackage className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-bold text-gray-800">No ComboKits Found</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {hasActiveQuickFilters
              ? "No ComboKits match the selected Quick Filters criteria. Try adjusting or clearing the filters above."
              : searchQuery
                ? `No kits matched "${searchQuery}". Try a different keyword.`
                : "No combo kits found in database."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {hasActiveQuickFilters && (
              <button
                onClick={clearQuickFilters}
                className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                Clear Quick Filters
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilterTab("all");
                }}
                className="px-4 py-2 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredKits.map((kit) => {
            const isCustom = kit.has_custom_rule;
            const advPct = kit.advance_percentage || 30;
            const balPct = kit.balance_percentage || 70;

            return (
              <div
                key={kit.kit_id || kit.id}
                onClick={() => handleConfigureKit(kit)}
                className="group relative bg-white rounded-2xl border border-gray-200 hover:border-amber-500 shadow-xs hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Top Image & Badges */}
                <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                  <img
                    src={
                      kit.image ||
                      "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={kit.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80";
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Capacity Tag (Overlaid top-left) */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-amber-400 text-xs font-black flex items-center gap-1 border border-white/10 shadow-xs">
                    <FaBolt className="text-[11px]" />
                    {kit.capacity ? `${kit.capacity} kW` : "System Kit"}
                  </div>

                  {/* Configuration Status Badge (Overlaid top-right) */}
                  <div className="absolute top-3 right-3">
                    {isCustom ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400 shadow-xs flex items-center gap-1">
                        <FiCheckCircle size={11} />
                        Custom Milestones
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/65 backdrop-blur-md text-gray-200 border border-white/15 shadow-xs flex items-center gap-1">
                        <FiSliders size={11} />
                        Default Policy
                      </span>
                    )}
                  </div>

                  {/* System Type Tag (Overlaid bottom-left) */}
                  <div className="absolute bottom-2.5 left-3 text-[11px] font-medium text-white/90">
                    {kit.system_type || "On-Grid Solar System"}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      {kit.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {kit.category}
                        </span>
                      )}
                      {kit.projectRange && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {kit.projectRange}
                        </span>
                      )}
                    </div>
                    <h3
                      className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug"
                      title={kit.name}
                    >
                      {kit.name}
                    </h3>
                  </div>

                  {/* Milestone Split Progress Bar */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Advance: <strong>{advPct}%</strong>
                      </span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Balance: <strong>{balPct}%</strong>
                      </span>
                    </div>

                    {/* Two-tone bar */}
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${advPct}%` }}
                        className="bg-amber-500 h-full"
                        title={`Advance: ${advPct}%`}
                      />
                      <div
                        style={{ width: `${balPct}%` }}
                        className="bg-primary h-full"
                        title={`Balance: ${balPct}%`}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-500 pt-0.5">
                      <span>Order Placement</span>
                      <span>Before Dispatch</span>
                    </div>
                  </div>

                  {/* Milestone Schedule Info */}
                  <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2.5">
                    <span className="flex items-center gap-1 text-gray-700 font-semibold">
                      <FiCreditCard size={12} className="text-emerald-600" />
                      {kit.milestones?.length || 2} Payment Milestones
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {(kit.milestones?.[0]?.percentage || 50)}% / {(kit.milestones?.[1]?.percentage || 50)}%
                    </span>
                  </div>

                  {/* Card Click CTA Button */}
                  <button
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gray-100 text-gray-800 group-hover:bg-amber-600 group-hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-2xs group-hover:shadow-md"
                  >
                    <span>{isCustom ? "Edit Milestones" : "Configure Milestones"}</span>
                    <FiArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Configuration Modal (Opens when user clicks any ComboKit card) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 via-amber-50/20 to-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {selectedKit?.image ? (
                  <img
                    src={selectedKit.image}
                    alt="Kit"
                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                    <FiCreditCard className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {isDefault ? "Configure Global Default Policy" : "Configure ComboKit Milestones"}
                    </h3>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isDefault
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                    >
                      {isDefault ? "Global Policy" : `${selectedKit?.capacity || 5} kW Kit`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 truncate max-w-lg">
                    {isDefault
                      ? "Standard fallback policy applied across all products"
                      : selectedKit?.name || "ComboKit Configuration"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Product Info Banner */}
              {!isDefault && selectedKit && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-amber-900 block">{selectedKit.name}</span>
                    <span className="text-gray-600">
                      Capacity: <strong>{selectedKit.capacity} kW</strong> • System Type:{" "}
                      <strong>{selectedKit.system_type || "On-Grid"}</strong>
                    </span>
                  </div>
                  {selectedKit.has_custom_rule && (
                    <button
                      type="button"
                      onClick={() => handleRevertToDefault(selectedKit)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 hover:border-red-300 rounded-lg shadow-2xs flex items-center gap-1 shrink-0 transition"
                    >
                      <FiRotateCcw size={12} /> Revert to Global Default
                    </button>
                  )}
                </div>
              )}

              {/* Rule Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. 5kW Bifacial ComboKit Milestone Policy"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Description / Checkout Note
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instructions displayed to EPC during checkout..."
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* ── Payment Milestones Breakdown Builder (30% Adv / 70% Bal) ── */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <FiPercent className="w-4 h-4 text-amber-600" />
                      Payment Milestones Breakdown
                    </h4>
                    <p className="text-xs text-gray-500">
                      Configure each payment milestone percentage. Must sum to exactly 100%.
                    </p>
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${isValidPercentage
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-red-100 text-red-700 border border-red-300 animate-pulse"
                        }`}
                    >
                      Total: {totalPercentage}% {isValidPercentage ? "✓" : "(Must be 100%)"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          Milestone {idx + 1}: {idx === 0 ? "Advance Payment" : "Remaining Balance"}
                        </span>
                        {milestones.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(idx)}
                            className="text-gray-400 hover:text-red-600 text-xs flex items-center gap-1"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-gray-500">Milestone Title</label>
                          <input
                            type="text"
                            value={m.title}
                            onChange={(e) => handleMilestoneChange(idx, "title", e.target.value)}
                            placeholder="e.g. Milestone 1 — Advance Payment"
                            className="w-full mt-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-gray-500">Percentage (%)</label>
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={m.percentage}
                              onChange={(e) => handleMilestoneChange(idx, "percentage", e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 pr-7"
                              required
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs text-gray-400 font-bold">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-gray-500">Payment Stage</label>
                          <select
                            value={m.stage_key}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleMilestoneChange(idx, "stage_key", val);
                              handleMilestoneChange(
                                idx,
                                "stage_label",
                                val === "order_placement"
                                  ? "Advance Payment at Order Placement"
                                  : "Before Dispatch"
                              );
                              handleMilestoneChange(idx, "allows_dispatch", val === "before_dispatch");
                            }}
                            className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="order_placement">Advance Payment at Order Placement</option>
                            <option value="before_dispatch">Before Dispatch</option>
                            <option value="on_dispatch">On Dispatch</option>
                            <option value="delivery">On Delivery</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-medium text-gray-500">Description for EPC</label>
                          <input
                            type="text"
                            value={m.description || ""}
                            onChange={(e) => handleMilestoneChange(idx, "description", e.target.value)}
                            placeholder={
                              idx === 0
                                ? "30% advance collected at checkout to confirm order and initiate procurement."
                                : "Remaining 70% balance collected before materials are dispatched from warehouse."
                            }
                            className="w-full mt-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.payment_proof_required !== false}
                              onChange={(e) => handleMilestoneChange(idx, "payment_proof_required", e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>Require UTR & Bank Slip</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!m.allows_dispatch}
                              onChange={(e) => handleMilestoneChange(idx, "allows_dispatch", e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>Clears Dispatch Clearance</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="w-full py-2 text-xs font-semibold text-amber-700 border border-dashed border-amber-300 rounded-lg hover:bg-amber-50/50 flex items-center justify-center gap-1.5 transition"
                >
                  <FiPlus className="w-3.5 h-3.5" /> Add Additional Milestone
                </button>
              </div>

              {/* ── Order Stages & Turnaround Time (TAT) Separation Notice ── */}
              <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <FiClock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-blue-900">
                      Order Stages & Turnaround Time (TAT) Configuration
                    </h5>
                    <p className="text-blue-700/80 leading-relaxed">
                      Fulfillment turnaround windows, step-by-step TAT (Days/Hours), and live customer delivery milestones are configured centrally under <strong>Order Management Settings</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    navigate("/admin-panel/solar-shop/order-management-settings/order-stages-tat");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  Configure TAT <FiArrowRight size={12} />
                </button>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Enable this milestone rule immediately</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isValidPercentage}
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {saving ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" /> Save Milestone Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
