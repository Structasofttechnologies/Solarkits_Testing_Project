import React, { useState, useEffect } from "react";
import {
  FiPackage,
  FiTool,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiSearch,
  FiRefreshCw,
  FiImage,
  FiCheckCircle,
  FiXCircle,
  FiSliders,
  FiCheckSquare,
  FiSave,
  FiX,
} from "react-icons/fi";
import PageHeader from "@/components/PageHeader";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
// BOS Custom Catalog lives under the /api route (not admin-api), so we use VITE_BACKEND_URL + /api
const SHOP_API_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000") + "/api";

export default function BosKitManager() {
  const [activeTab, setActiveTab] = useState("preconfigured"); // 'preconfigured' | 'custom'
  const [loading, setLoading] = useState(false);

  // BOS Kits Database State
  const [bosKits, setBosKits] = useState([]);

  // Custom Catalog Database State
  const [customCatalog, setCustomCatalog] = useState([]);

  // Fetch BOS Kits & Custom Catalog from Live Database APIs
  const fetchDatabaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pre-Configured BOS Kits directly from backend MongoDB API
      let fetchedKits = [];
      try {
        const resKits = await axios.get(`${SHOP_API_URL}/india/v1/shop/bos-kits`);
        if (resKits.data?.data && Array.isArray(resKits.data.data) && resKits.data.data.length > 0) {
          fetchedKits = resKits.data.data;
        }
      } catch (e) {
        console.warn("API fetch for bos-kits error:", e.message);
      }

      // Fallback: Check combo-kits or local cache if bos-kits was empty
      if (fetchedKits.length === 0) {
        try {
          const resCombo = await axios.get(
            `${API_URL}/combo-kits/india/get-kits?unique_id=ADM_COMBO_KITS&req_for=view&is_custom=false`,
            { headers: authHeaderObj() }
          );
          if (resCombo.data?.data && Array.isArray(resCombo.data.data)) {
            const bosCombo = resCombo.data.data.filter(
              (k) => (k.category || "").toLowerCase().includes("bos") || (k.name || "").toLowerCase().includes("bos")
            );
            if (bosCombo.length > 0) fetchedKits = bosCombo;
          }
        } catch {}
      }

      if (fetchedKits.length === 0) {
        const dbKitsStr = localStorage.getItem("solar_bos_kits_admin_store");
        if (dbKitsStr && JSON.parse(dbKitsStr).length > 0) {
          fetchedKits = JSON.parse(dbKitsStr);
        }
      }
      setBosKits(fetchedKits);
      localStorage.setItem("solar_bos_kits_admin_store", JSON.stringify(fetchedKits));

      // 2. Fetch Custom Catalog directly from Live MongoDB Database API endpoint
      try {
        const resCat = await axios.get(`${SHOP_API_URL}/india/v1/shop/bos-custom-catalog`);
        if (resCat.data?.data && Array.isArray(resCat.data.data) && resCat.data.data.length > 0) {
          setCustomCatalog(resCat.data.data);
          localStorage.setItem("solar_custom_bos_catalog_admin_store", JSON.stringify(resCat.data.data));
        }
      } catch (e) {
        console.warn("API fetch for custom catalog error:", e.message);
      }

      // Broadcast update event so customer app syncs instantly
      window.dispatchEvent(new Event("solar_bos_data_updated"));
    } catch (error) {
      console.error("Database fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  // Save to DB helper
  const saveBosKits = async (updatedKits) => {
    setBosKits(updatedKits);
    localStorage.setItem("solar_bos_kits_admin_store", JSON.stringify(updatedKits));
    try {
      await axios.post(`${SHOP_API_URL}/india/v1/shop/bos-kits`, { kits: updatedKits });
    } catch (e) {
      console.warn("Failed to sync full BOS kits to API:", e.message);
    }
    window.dispatchEvent(new Event("solar_bos_data_updated"));
  };

  const saveCustomCatalog = async (updatedCatalog) => {
    setCustomCatalog(updatedCatalog);
    localStorage.setItem("solar_custom_bos_catalog_admin_store", JSON.stringify(updatedCatalog));
    try {
      await axios.post(`${SHOP_API_URL}/india/v1/shop/bos-custom-catalog`, { catalog: updatedCatalog });
    } catch (e) {
      console.warn("Failed to save custom catalog to API:", e.message);
    }
    window.dispatchEvent(new Event("solar_bos_data_updated"));
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [editingKit, setEditingKit] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showKitModal, setShowKitModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // Form states for Pre-configured BOS Kit
  const [kitForm, setKitForm] = useState({
    name: "",
    category: "Complete BOS Combos",
    subCategory: "Single Phase",
    systemType: "On-Grid & Hybrid",
    projectRange: "3kw-5kw",
    comboKitType: "Standard Residential",
    ourPrice: 5000,
    marketPrice: 7500,
    inStock: true,
    availableStock: 20,
    warranty: "5 Years Replacement",
    badge: "Certified BOS Kit",
    imageUrl: "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80",
    selectedComponents: [],
    customInputComponent: "",
  });

  // Form states for Customize Component
  const [itemForm, setItemForm] = useState({
    group: "Protection & AC/DC Enclosures",
    name: "",
    unitPrice: 500,
    unit: "Piece",
    defaultQty: 50,
    recommendedPerKw: 10,
    packInfo: "50 Meters (Recommended for 5 kW System)",
    availableStock: 50,
    specs: "Standard Specs",
    imageUrl: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
  });

  // Pre-configured BOS Kit Actions
  const handleOpenKitModal = (kit = null) => {
    if (kit) {
      setEditingKit(kit);
      setKitForm({
        name: kit.name,
        category: kit.category || "Complete BOS Combos",
        subCategory: kit.subCategory || "Single Phase",
        systemType: kit.systemType || "On-Grid & Hybrid",
        projectRange: kit.projectRange || "3kw-5kw",
        comboKitType: kit.comboKitType || "Standard Residential",
        ourPrice: kit.ourPrice,
        marketPrice: kit.marketPrice,
        inStock: kit.inStock !== false,
        availableStock: kit.availableStock || 20,
        warranty: kit.warranty || "5 Years Replacement",
        badge: kit.badge || "Certified BOS Kit",
        imageUrl: kit.imageUrl || kit.image || "",
        selectedComponents: Array.isArray(kit.components) ? [...kit.components] : [],
        customInputComponent: "",
      });
    } else {
      setEditingKit(null);
      setKitForm({
        name: "",
        category: "Complete BOS Combos",
        subCategory: "Single Phase",
        systemType: "On-Grid & Hybrid",
        projectRange: "3kw-5kw",
        comboKitType: "Standard Residential",
        ourPrice: 8500,
        marketPrice: 12500,
        inStock: true,
        availableStock: 20,
        warranty: "5 Years Replacement",
        badge: "Certified BOS Kit",
        imageUrl: "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80",
        selectedComponents: [],
        customInputComponent: "",
      });
    }
    setShowKitModal(true);
  };

  const handleAddComponentToKit = (compName) => {
    if (!compName) return;
    if (!kitForm.selectedComponents.includes(compName)) {
      setKitForm((prev) => ({
        ...prev,
        selectedComponents: [...prev.selectedComponents, compName],
        customInputComponent: "",
      }));
    }
  };

  const handleRemoveComponentFromKit = (indexToRemove) => {
    setKitForm((prev) => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSaveKit = async (e) => {
    e.preventDefault();
    const kitPayload = {
      id: editingKit ? (editingKit._id || editingKit.id) : undefined,
      _id: editingKit ? (editingKit._id || editingKit.id) : undefined,
      name: kitForm.name,
      category: kitForm.category,
      subCategory: kitForm.subCategory,
      systemType: kitForm.systemType,
      projectRange: kitForm.projectRange,
      comboKitType: kitForm.comboKitType,
      ourPrice: Number(kitForm.ourPrice),
      marketPrice: Number(kitForm.marketPrice),
      inStock: Boolean(kitForm.inStock),
      availableStock: Number(kitForm.availableStock),
      warranty: kitForm.warranty,
      badge: kitForm.badge,
      imageUrl: kitForm.imageUrl,
      image: kitForm.imageUrl,
      rating: editingKit?.rating || 4.9,
      reviewsCount: editingKit?.reviewsCount || 25,
      components: kitForm.selectedComponents.length > 0
        ? kitForm.selectedComponents
        : ["DCDB Protection Box", "ACDB Enclosure Box", "4.0 sq mm Solar DC Cable"],
      specifications: editingKit?.specifications || {
        "Enclosure Rating": "IP65 Weatherproof",
        "Certification": "BIS & MNRE Approved"
      }
    };

    try {
      // Save directly to Backend Database API
      const res = await axios.post(`${SHOP_API_URL}/india/v1/shop/bos-kits/save-single`, kitPayload);
      const savedDoc = res.data?.data || kitPayload;
      
      let updated;
      if (editingKit) {
        const editId = editingKit._id || editingKit.id;
        updated = bosKits.map((k) => ((k._id || k.id) === editId ? savedDoc : k));
      } else {
        updated = [savedDoc, ...bosKits];
      }
      setBosKits(updated);
      localStorage.setItem("solar_bos_kits_admin_store", JSON.stringify(updated));
      window.dispatchEvent(new Event("solar_bos_data_updated"));
    } catch (err) {
      console.warn("Direct save API error, updating local state:", err.message);
      let updated;
      if (editingKit) {
        updated = bosKits.map((k) => ((k._id || k.id) === (editingKit._id || editingKit.id) ? kitPayload : k));
      } else {
        updated = [kitPayload, ...bosKits];
      }
      saveBosKits(updated);
    }

    setShowKitModal(false);
  };

  const handleDeleteKit = async (id) => {
    if (window.confirm("Are you sure you want to delete this BOS Kit?")) {
      const targetId = typeof id === "object" ? (id._id || id.id) : id;
      try {
        await axios.delete(`${SHOP_API_URL}/india/v1/shop/bos-kits/${targetId}`);
      } catch (err) {
        console.warn("Error deleting kit from shop bos-kits API:", err.message);
      }
      try {
        await axios.post(
          `${API_URL}/combo-kits/india/delete-kit?unique_id=ADM_COMBO_KITS&req_for=delete`,
          { id: targetId },
          { headers: authHeaderObj() }
        );
      } catch {}

      const updated = bosKits.filter((k) => (k._id || k.id) !== targetId && k.id !== targetId);
      setBosKits(updated);
      localStorage.setItem("solar_bos_kits_admin_store", JSON.stringify(updated));
      window.dispatchEvent(new Event("solar_bos_data_updated"));
    }
  };

  const handleToggleStockKit = async (id) => {
    const targetId = typeof id === "object" ? (id._id || id.id) : id;
    try {
      await axios.patch(`${SHOP_API_URL}/india/v1/shop/bos-kits/${targetId}/stock`);
    } catch (err) {
      console.warn("Stock toggle API error:", err.message);
    }
    const updated = bosKits.map((k) => ((k._id || k.id) === targetId ? { ...k, inStock: !k.inStock } : k));
    setBosKits(updated);
    localStorage.setItem("solar_bos_kits_admin_store", JSON.stringify(updated));
    window.dispatchEvent(new Event("solar_bos_data_updated"));
  };

  // Custom Component Actions
  const handleOpenItemModal = (groupName, item = null) => {
    if (item) {
      setEditingItem({ ...item, groupName });
      setItemForm({
        group: groupName,
        name: item.name,
        unitPrice: item.unitPrice,
        unit: item.unit,
        defaultQty: item.defaultQty ?? 50,
        recommendedPerKw: item.recommendedPerKw ?? 10,
        packInfo: item.packInfo || "",
        availableStock: item.availableStock || 50,
        specs: item.specs || "",
        imageUrl: item.imageUrl || item.image || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({
        group: groupName || "Protection & AC/DC Enclosures",
        name: "",
        unitPrice: 500,
        unit: "Piece",
        defaultQty: 50,
        recommendedPerKw: 10,
        packInfo: "50 Meters (Recommended for 5 kW System)",
        availableStock: 50,
        specs: "Standard Specs",
        imageUrl: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();

    const newItemObj = {
      id: editingItem ? editingItem.id : `c_comp_${Date.now()}`,
      name: itemForm.name,
      unitPrice: Number(itemForm.unitPrice),
      unit: itemForm.unit,
      defaultQty: Number(itemForm.defaultQty ?? 1),
      recommendedPerKw: Number(itemForm.recommendedPerKw ?? 0),
      packInfo: itemForm.packInfo,
      availableStock: Number(itemForm.availableStock),
      specs: itemForm.specs,
      imageUrl: itemForm.imageUrl,
      image: itemForm.imageUrl,
      icon: "🔧",
    };

    const targetGroup = itemForm.group;
    let groupExists = false;

    const updatedCatalog = customCatalog.map((groupObj) => {
      if (groupObj.group === targetGroup) {
        groupExists = true;
        let newItems;
        if (editingItem && editingItem.groupName === targetGroup) {
          newItems = groupObj.items.map((i) => (i.id === editingItem.id ? newItemObj : i));
        } else {
          newItems = [...groupObj.items, newItemObj];
        }
        return { ...groupObj, items: newItems };
      }
      return groupObj;
    });

    if (!groupExists) {
      updatedCatalog.push({
        group: targetGroup,
        icon: "📦",
        items: [newItemObj],
      });
    }

    saveCustomCatalog(updatedCatalog);
    setShowItemModal(false);
  };

  const handleDeleteItem = (groupName, itemId) => {
    if (window.confirm("Remove component from Custom BOS Catalog?")) {
      const updatedCatalog = customCatalog.map((g) => {
        if (g.group === groupName) {
          return { ...g, items: g.items.filter((i) => i.id !== itemId) };
        }
        return g;
      });
      saveCustomCatalog(updatedCatalog);
    }
  };

  const filteredBosKits = bosKits.filter(
    (k) =>
      k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen space-y-6 text-text-primary">
      <PageHeader
        title="BOS Kits & Customize Components Configuration"
        subtitle="Create and manage pre-configured Solar BOS Combos and Customize Component Catalogs live on http://localhost:5177/solar-bos-kit"
        icon={FiPackage}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                localStorage.setItem("solar_bos_kits_admin_store", JSON.stringify(SEED_BOS_KITS));
                localStorage.setItem("solar_custom_bos_catalog_admin_store", JSON.stringify(SEED_CUSTOM_CATALOG));
                setBosKits(SEED_BOS_KITS);
                setCustomCatalog(SEED_CUSTOM_CATALOG);
                window.dispatchEvent(new Event("solar_bos_data_updated"));
              }}
              className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs font-semibold cursor-pointer"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Seed & Reload Real Data
            </button>
          </div>
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between gap-4 bg-surface border border-border p-2 rounded-2xl shadow-sm flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("preconfigured")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "preconfigured"
                ? "bg-primary text-white shadow-md"
                : "bg-surface-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            <FiPackage />
            <span>Pre-Configured BOS Kits ({bosKits.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "custom"
                ? "bg-primary text-white shadow-md"
                : "bg-surface-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            <FiTool className="text-amber-300" />
            <span>Customize BOS Components ({customCatalog.reduce((a, b) => a + b.items.length, 0)})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-3">
          <button
            onClick={() => (activeTab === "preconfigured" ? handleOpenKitModal() : handleOpenItemModal("Protection & AC/DC Enclosures"))}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
          >
            <FiPlus size={16} />
            <span>{activeTab === "preconfigured" ? "Add New BOS Kit" : "Add Custom Component"}</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: PRE-CONFIGURED BOS KITS MANAGER                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "preconfigured" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-surface border border-border p-4 rounded-xl shadow-xs">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
              <input
                type="text"
                placeholder="Search BOS Kits by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-xs bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <span className="text-xs text-text-secondary font-medium">
              Showing {filteredBosKits.length} kits
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBosKits.map((kit) => {
              const kitId = kit._id || kit.id;
              return (
              <div key={kitId} className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition">
                <div className="relative h-44 overflow-hidden bg-surface-hover border-b border-border">
                  <img src={kit.imageUrl || kit.image} alt={kit.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {kit.category}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-slate-900/80 text-emerald-400 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    {kit.inStock ? "In Stock" : "Out of Stock"}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-text-primary leading-snug mb-2">{kit.name}</h3>
                    <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
                      <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">{kit.subCategory}</span>
                      <span className="bg-surface-hover text-text-secondary px-2 py-0.5 rounded">{kit.systemType}</span>
                      <span className="bg-surface-hover text-text-secondary px-2 py-0.5 rounded">{kit.projectRange}</span>
                    </div>

                    <div className="bg-surface-hover/60 p-3 rounded-xl text-xs text-text-secondary space-y-1 mb-3">
                      <div className="font-semibold text-text-primary mb-1">Key Included Items ({kit.components?.length || 0}):</div>
                      {(kit.components || []).slice(0, 3).map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 truncate">
                          <FiCheck className="text-green-600 shrink-0" />
                          <span className="truncate">{comp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs text-text-secondary line-through">₹{kit.marketPrice?.toLocaleString()}</span>
                      <div className="text-base font-extrabold text-primary">₹{kit.ourPrice?.toLocaleString()}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStockKit(kitId)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer ${kit.inStock ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}`}
                        title="Toggle Stock Status"
                      >
                        {kit.inStock ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
                      </button>
                      <button
                        onClick={() => handleOpenKitModal(kit)}
                        className="p-2 bg-surface-hover hover:bg-border rounded-lg text-text-primary text-xs font-semibold cursor-pointer"
                        title="Edit Kit"
                      >
                        <FiEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteKit(kitId)}
                        className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs cursor-pointer"
                        title="Delete Kit"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: CUSTOMIZE BOS COMPONENTS MANAGER                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "custom" && (
        <div className="space-y-6">
          {customCatalog.map((catGroup, gIdx) => (
            <div key={gIdx} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catGroup.icon}</span>
                  <h3 className="font-bold text-base text-text-primary">{catGroup.group}</h3>
                  <span className="text-xs bg-surface-hover px-2.5 py-0.5 rounded-full text-text-secondary font-semibold">
                    {catGroup.items.length} Items
                  </span>
                </div>
                <button
                  onClick={() => handleOpenItemModal(catGroup.group)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <FiPlus /> Add Item to {catGroup.group}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catGroup.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-hover/30 hover:border-primary/40 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img src={item.imageUrl || item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                      <div className="min-w-0 pr-2">
                        <h4 className="font-semibold text-sm text-text-primary truncate">{item.name}</h4>
                        <div className="text-xs text-text-secondary mt-0.5">
                          <strong className="text-primary">₹{item.unitPrice?.toLocaleString()}</strong> per {item.unit}
                        </div>
                        {item.packInfo && (
                          <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            ⚡ Admin Set: {item.packInfo}
                          </div>
                        )}
                        {!item.packInfo && item.defaultQty && (
                          <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            ⚡ Admin Set Default: {item.defaultQty} {item.unit}s
                          </div>
                        )}
                        <div className="text-[11px] text-text-muted truncate mt-0.5">{item.specs}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenItemModal(catGroup.group, item)}
                        className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded-md cursor-pointer"
                        title="Edit Item"
                      >
                        <FiEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(catGroup.group, item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-md cursor-pointer"
                        title="Delete Item"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL FOR PRE-CONFIGURED BOS KIT                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showKitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-lg text-text-primary">
                {editingKit ? "Edit Pre-Configured BOS Kit" : "Add New Pre-Configured BOS Kit"}
              </h3>
              <button onClick={() => setShowKitModal(false)} className="text-text-muted hover:text-text-primary font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Kit Name *</label>
                <input
                  type="text"
                  required
                  value={kitForm.name}
                  onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                  placeholder="e.g. 5 kW Single Phase Residential BOS Kit"
                  className="w-full p-2.5 border border-border rounded-xl bg-surface"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={kitForm.category}
                    onChange={(e) => setKitForm({ ...kitForm, category: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  >
                    <option value="Complete BOS Combos">Complete BOS Combos</option>
                    <option value="Protection & AC/DC Boxes">Protection & AC/DC Boxes</option>
                    <option value="Cables & Connectors">Cables & Connectors</option>
                    <option value="Earthing & Lightning Systems">Earthing & Lightning Systems</option>
                    <option value="Mounting Structures (MMS)">Mounting Structures (MMS)</option>
                    <option value="Agriculture & Solar Pumps">Agriculture & Solar Pumps</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Sub Category</label>
                  <select
                    value={kitForm.subCategory}
                    onChange={(e) => setKitForm({ ...kitForm, subCategory: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  >
                    <option value="Single Phase">Single Phase</option>
                    <option value="Three Phase">Three Phase</option>
                    <option value="Dual String">Dual String</option>
                    <option value="Heavy Duty">Heavy Duty</option>
                    <option value="Aluminium Rail">Aluminium Rail</option>
                    <option value="Copper Bonded">Copper Bonded</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">System Type</label>
                  <select
                    value={kitForm.systemType}
                    onChange={(e) => setKitForm({ ...kitForm, systemType: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  >
                    <option value="On-Grid & Hybrid">On-Grid & Hybrid</option>
                    <option value="Commercial 3-Phase">Commercial 3-Phase</option>
                    <option value="Solar Water Pump">Solar Water Pump</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Project Range</label>
                  <select
                    value={kitForm.projectRange}
                    onChange={(e) => setKitForm({ ...kitForm, projectRange: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  >
                    <option value="1kw-3kw">1 kW - 3 kW</option>
                    <option value="3kw-5kw">3 kW - 5 kW</option>
                    <option value="10kw-25kw">10 kW - 25 kW</option>
                    <option value="25kw-100kw">25 kW - 100 kW</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">BOS Kit Type</label>
                  <select
                    value={kitForm.comboKitType}
                    onChange={(e) => setKitForm({ ...kitForm, comboKitType: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  >
                    <option value="Standard Residential">Standard Residential</option>
                    <option value="Pre-Wired Plug & Play">Pre-Wired Plug & Play</option>
                    <option value="Heavy Duty Industrial">Heavy Duty Industrial</option>
                    <option value="High Wind Rated">High Wind Rated</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Warranty Details</label>
                  <input
                    type="text"
                    value={kitForm.warranty}
                    onChange={(e) => setKitForm({ ...kitForm, warranty: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Our Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={kitForm.ourPrice}
                    onChange={(e) => setKitForm({ ...kitForm, ourPrice: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Market Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={kitForm.marketPrice}
                    onChange={(e) => setKitForm({ ...kitForm, marketPrice: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Available Stock Qty</label>
                  <input
                    type="number"
                    value={kitForm.availableStock}
                    onChange={(e) => setKitForm({ ...kitForm, availableStock: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Image / Photo URL</label>
                  <input
                    type="text"
                    value={kitForm.imageUrl}
                    onChange={(e) => setKitForm({ ...kitForm, imageUrl: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>
              </div>

              {/* Enhanced Interactive Component Picker */}
              <div className="space-y-2 border-t border-border pt-3">
                <label className="font-semibold block text-xs">
                  Included Components ({kitForm.selectedComponents.length} selected) *
                </label>

                {/* Selected Components Chips */}
                <div className="flex flex-wrap gap-2 p-3 bg-surface-hover/50 border border-border rounded-xl min-h-[50px]">
                  {kitForm.selectedComponents.length > 0 ? (
                    kitForm.selectedComponents.map((comp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-semibold rounded-lg text-xs"
                      >
                        <span>{comp}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveComponentFromKit(idx)}
                          className="hover:text-red-500 font-bold ml-1 cursor-pointer"
                        >
                          <FiX size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-text-muted italic text-xs">
                      No components selected yet. Pick from the catalog dropdown below or type a custom component name.
                    </span>
                  )}
                </div>

                {/* Dropdown Selector from Added Custom Components */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="sm:col-span-2">
                    <select
                      onChange={(e) => {
                        handleAddComponentToKit(e.target.value);
                        e.target.value = "";
                      }}
                      className="w-full p-2.5 border border-border rounded-xl bg-surface text-xs font-semibold cursor-pointer"
                    >
                      <option value="">-- Select from Customize BOS Components Catalog --</option>
                      {customCatalog.map((groupObj, gIdx) => (
                        <optgroup key={gIdx} label={`${groupObj.icon} ${groupObj.group}`}>
                          {groupObj.items.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} (₹{item.unitPrice}/{item.unit})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Or Type Custom Component Name */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={kitForm.customInputComponent}
                      onChange={(e) => setKitForm({ ...kitForm, customInputComponent: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddComponentToKit(kitForm.customInputComponent.trim());
                        }
                      }}
                      placeholder="Or type custom item..."
                      className="w-full p-2.5 border border-border rounded-xl bg-surface text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComponentToKit(kitForm.customInputComponent.trim())}
                      className="px-3 py-2.5 bg-surface-hover hover:bg-border border border-border rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowKitModal(false)}
                  className="px-4 py-2 bg-surface-hover rounded-xl text-text-secondary font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save BOS Kit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL FOR CUSTOMIZE COMPONENT                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-lg text-text-primary">
                {editingItem ? "Edit Custom BOS Component" : "Add Custom BOS Component"}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-text-muted hover:text-text-primary font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Component / Material Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. 4.0 sq mm Twin Core UV Solar DC Cable"
                  className="w-full p-2.5 border border-border rounded-xl bg-surface"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Group / Category</label>
                <select
                  value={itemForm.group}
                  onChange={(e) => setItemForm({ ...itemForm, group: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-xl bg-surface"
                >
                  <option value="Protection & AC/DC Enclosures">Protection & AC/DC Enclosures</option>
                  <option value="Cables & Wiring Accessories">Cables & Wiring Accessories</option>
                  <option value="Earthing & Protection Systems">Earthing & Protection Systems</option>
                  <option value="Mounting Structure Hardware">Mounting Structure Hardware</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Unit Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Unit Type</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  >
                    <option value="Piece">Piece</option>
                    <option value="Meter">Meter</option>
                    <option value="Pair">Pair</option>
                    <option value="Set">Set</option>
                    <option value="Roll">Roll</option>
                    <option value="Box">Box</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Admin Default Qty (for 5 kW)</label>
                  <input
                    type="number"
                    value={itemForm.defaultQty}
                    onChange={(e) => setItemForm({ ...itemForm, defaultQty: e.target.value })}
                    placeholder="e.g. 50 (Meters or Pcs)"
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Qty per 1 kW (Scaling Rate)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemForm.recommendedPerKw}
                    onChange={(e) => setItemForm({ ...itemForm, recommendedPerKw: e.target.value })}
                    placeholder="e.g. 10 (Meters/kW)"
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Available Stock</label>
                  <input
                    type="number"
                    value={itemForm.availableStock}
                    onChange={(e) => setItemForm({ ...itemForm, availableStock: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Length / Specs Details</label>
                  <input
                    type="text"
                    value={itemForm.specs}
                    onChange={(e) => setItemForm({ ...itemForm, specs: e.target.value })}
                    placeholder="e.g. 100m Roll, IP65 Rated"
                    className="w-full p-2.5 border border-border rounded-xl bg-surface"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Admin Package Recommendation Note</label>
                <input
                  type="text"
                  value={itemForm.packInfo}
                  onChange={(e) => setItemForm({ ...itemForm, packInfo: e.target.value })}
                  placeholder="e.g. 50 Meters (Recommended for 5 kW System) or 40 Pcs J-Bolts Pack"
                  className="w-full p-2.5 border border-border rounded-xl bg-surface"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Image / Photo URL</label>
                <input
                  type="text"
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-xl bg-surface"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-surface-hover rounded-xl text-text-secondary font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
