import { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  FaArrowLeft,
  FaWarehouse,
  FaMapMarkerAlt,
  FaBoxes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSave,
  FaSync,
  FaSun,
  FaBolt,
  FaHandshake,
  FaTruck,
  FaCheck,
  FaTimes,
  FaShieldAlt
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;
const PARTNER_MAPPINGS_API = `${API_URL}/solarshop/warehouse-partner-mappings`;

export default function WarehouseKitPartnerConfigView({
  warehouse,
  onBack,
  onConfigSaved
}) {
  const dispatch = useDispatch();
  const warehouseId = warehouse?.id || warehouse?._id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKitId, setSavingKitId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);

  const [warehouseDetails, setWarehouseDetails] = useState(null);
  const [kits, setKits] = useState([]);
  const [oemPartners, setOemPartners] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Local state for product mappings:
  // { [kitId]: { [componentKey]: { partner_type: 'oem_partner' | 'supplier', partner_id: string, notes: string } } }
  const [kitFormState, setKitFormState] = useState({});
  const [savedSuccessMap, setSavedSuccessMap] = useState({});

  // 1. Fetch Warehouse Data & Live Kits
  const fetchWarehouseKits = async (isManual = false) => {
    if (!warehouseId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const headers = authHeaderObj();
      const res = await axios.get(
        `${PARTNER_MAPPINGS_API}/warehouse/${warehouseId}`,
        { headers }
      );

      if (res.data?.status === "success") {
        const data = res.data;
        setWarehouseDetails(data.warehouse || warehouse);
        setKits(data.kits || []);
        setOemPartners(data.available_oem_partners || []);
        setSuppliers(data.available_suppliers || []);

        // Initialize local form state: exactly one partner per product
        const initialForm = {};
        (data.kits || []).forEach((kit) => {
          const kId = kit.id || kit._id;
          initialForm[kId] = {};
          (kit.products || []).forEach((prod) => {
            const hasSupplier = Boolean(prod.supplier_partner_id);
            const initialType = prod.partner_type || (hasSupplier ? "supplier" : "oem_partner");
            const initialId = (initialType === "supplier" ? prod.supplier_partner_id : prod.oem_partner_id) || prod.partner_id || "";

            initialForm[kId][prod.component_key] = {
              partner_type: initialType,
              partner_id: initialId ? String(initialId) : "",
              notes: prod.notes || ""
            };
          });
        });
        setKitFormState(initialForm);
      }
    } catch (err) {
      console.error("Error fetching warehouse partner config:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load warehouse kit products",
          duration: 4000
        })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWarehouseKits();
  }, [warehouseId]);

  // Handle field change
  const handleFieldChange = (kitId, compKey, field, value) => {
    setKitFormState((prev) => ({
      ...prev,
      [kitId]: {
        ...prev[kitId],
        [compKey]: {
          ...(prev[kitId]?.[compKey] || { partner_type: "oem_partner", partner_id: "", notes: "" }),
          [field]: value
        }
      }
    }));
  };

  // Helper: Is component mapped in current state
  const isComponentMappedInForm = (kitId, compKey) => {
    const item = kitFormState[kitId]?.[compKey];
    if (!item) return false;
    return Boolean(item.partner_id);
  };

  // Dynamically computed stats
  const computedStats = useMemo(() => {
    let totalProducts = 0;
    let mappedProducts = 0;
    let fullyConfiguredKits = 0;

    kits.forEach((kit) => {
      const kId = kit.id || kit._id;
      const prods = kit.products || [];
      totalProducts += prods.length;

      let kitMappedCount = 0;
      prods.forEach((p) => {
        if (isComponentMappedInForm(kId, p.component_key)) {
          kitMappedCount += 1;
        }
      });

      mappedProducts += kitMappedCount;
      if (prods.length > 0 && kitMappedCount === prods.length) {
        fullyConfiguredKits += 1;
      }
    });

    return {
      totalKits: kits.length,
      configuredKits: fullyConfiguredKits,
      pendingKits: kits.length - fullyConfiguredKits,
      totalProducts,
      mappedProducts
    };
  }, [kits, kitFormState]);

  // 2. Save Single Kit Settings
  const handleSaveKit = async (kit) => {
    const kId = kit.id || kit._id;
    const formKitState = kitFormState[kId] || {};

    const productMappingsPayload = (kit.products || []).map((prod) => {
      const formComp = formKitState[prod.component_key] || {
        partner_type: "oem_partner",
        partner_id: ""
      };
      const pType = formComp.partner_type === "supplier" ? "supplier" : "oem_partner";
      const pId = formComp.partner_id || null;

      return {
        component_key: prod.component_key,
        component_type: prod.component_type,
        product_name: prod.product_name,
        sku_code: prod.sku_code,
        template_name: prod.template_name,
        subtype_name: prod.subtype_name,
        brand_name: prod.brand_name,
        quantity: prod.quantity,
        image: prod.image,
        partner_type: pType,
        partner_id: pId,
        oem_partner_id: pType === "oem_partner" ? pId : null,
        supplier_partner_id: pType === "supplier" ? pId : null,
        notes: formComp.notes || null
      };
    });

    setSavingKitId(kId);
    try {
      const headers = authHeaderObj();
      const res = await axios.post(
        `${PARTNER_MAPPINGS_API}/save`,
        {
          warehouse_id: warehouseId,
          combo_kit_id: kId,
          product_mappings: productMappingsPayload
        },
        { headers }
      );

      if (res.data?.status === "success") {
        setSavedSuccessMap((prev) => ({ ...prev, [kId]: true }));
        setTimeout(() => {
          setSavedSuccessMap((prev) => ({ ...prev, [kId]: false }));
        }, 3000);

        dispatch(
          setAlert({
            type: "success",
            message: `Partner settings saved for "${kit.name}"`,
            duration: 3000
          })
        );

        if (onConfigSaved) onConfigSaved();
      }
    } catch (err) {
      console.error("Error saving kit partner mapping:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save kit settings",
          duration: 4000
        })
      );
    } finally {
      setSavingKitId(null);
    }
  };

  // 3. Bulk Save All Kits in this Warehouse
  const handleSaveAll = async () => {
    const kitMappingsPayload = kits.map((kit) => {
      const kId = kit.id || kit._id;
      const formKitState = kitFormState[kId] || {};

      const productMappings = (kit.products || []).map((prod) => {
        const formComp = formKitState[prod.component_key] || {
          partner_type: "oem_partner",
          partner_id: ""
        };
        const pType = formComp.partner_type === "supplier" ? "supplier" : "oem_partner";
        const pId = formComp.partner_id || null;

        return {
          component_key: prod.component_key,
          component_type: prod.component_type,
          product_name: prod.product_name,
          sku_code: prod.sku_code,
          template_name: prod.template_name,
          subtype_name: prod.subtype_name,
          brand_name: prod.brand_name,
          quantity: prod.quantity,
          image: prod.image,
          partner_type: pType,
          partner_id: pId,
          oem_partner_id: pType === "oem_partner" ? pId : null,
          supplier_partner_id: pType === "supplier" ? pId : null,
          notes: formComp.notes || null
        };
      });

      return {
        combo_kit_id: kId,
        product_mappings: productMappings
      };
    });

    setSavingAll(true);
    try {
      const headers = authHeaderObj();
      const res = await axios.post(
        `${PARTNER_MAPPINGS_API}/bulk-save`,
        {
          warehouse_id: warehouseId,
          kit_mappings: kitMappingsPayload
        },
        { headers }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: `All kit partner configurations saved for warehouse ${warehouseDetails?.warehouse_code || ""}`,
            duration: 3500
          })
        );
        if (onConfigSaved) onConfigSaved();
        fetchWarehouseKits(true);
      }
    } catch (err) {
      console.error("Error in bulk save:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save warehouse configurations",
          duration: 4000
        })
      );
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation & Back Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border bg-surface text-text-primary hover:text-primary hover:border-primary/40 font-bold text-xs transition-all shadow-2xs group"
        >
          <FaArrowLeft className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Warehouses List</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWarehouseKits(true)}
            disabled={loading || refreshing}
            className="p-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
            title="Refresh warehouse data"
          >
            <FaSync className={refreshing ? "animate-spin text-primary" : ""} size={13} />
          </button>

          {kits.length > 0 && (
            <Button
              variant="primary"
              onClick={handleSaveAll}
              loading={savingAll}
              disabled={savingAll || loading}
              leftIcon={<FaSave />}
              className="px-5 shadow-xs text-xs font-bold"
            >
              Save All Warehouse Configurations
            </Button>
          )}
        </div>
      </div>

      {/* Warehouse Details Banner */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/20 shrink-0">
            <FaWarehouse size={28} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary tracking-tight font-mono">
                {warehouseDetails?.warehouse_code || warehouse?.warehouse_code || "Warehouse"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {warehouseDetails?.cluster_name || warehouse?.cluster_name || "Cluster Mapped"}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  computedStats.configuredKits === computedStats.totalKits && computedStats.totalKits > 0
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : computedStats.configuredKits > 0
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "bg-danger/10 text-danger border border-danger/20"
                }`}
              >
                {computedStats.configuredKits === computedStats.totalKits && computedStats.totalKits > 0
                  ? "Fully Configured"
                  : computedStats.configuredKits > 0
                  ? "Partially Configured"
                  : "Pending Setup"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-secondary pt-0.5">
              <FaMapMarkerAlt className="text-primary/70 shrink-0" />
              <span>{warehouseDetails?.address || warehouse?.address || "Facility Address"}</span>
              <span className="text-text-muted">• {warehouseDetails?.state_name || warehouse?.state_name}</span>
            </div>
          </div>
        </div>

        {/* Quick Counts Badges */}
        <div className="flex items-center gap-3 flex-wrap bg-bg/60 p-3 rounded-xl border border-border">
          <div className="text-center px-3">
            <div className="text-lg font-black text-text-primary">{computedStats.totalKits}</div>
            <div className="text-[10px] font-bold text-text-muted uppercase">Live Kits</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center px-3">
            <div className="text-lg font-black text-emerald-500">{computedStats.configuredKits}</div>
            <div className="text-[10px] font-bold text-text-muted uppercase">Kits Configured</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center px-3">
            <div className="text-lg font-black text-amber-500">{computedStats.pendingKits}</div>
            <div className="text-[10px] font-bold text-text-muted uppercase">Kits Pending</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center px-3">
            <div className="text-lg font-black text-primary">
              {computedStats.mappedProducts}/{computedStats.totalProducts}
            </div>
            <div className="text-[10px] font-bold text-text-muted uppercase">Products Mapped</div>
          </div>
        </div>
      </div>

      {/* Main Kits List */}
      {loading ? (
        <div className="py-24">
          <Loader text="Loading warehouse live kits and dedicated components..." />
        </div>
      ) : kits.length === 0 ? (
        <div className="bg-surface p-12 rounded-2xl border border-border text-center space-y-3">
          <FaBoxes className="mx-auto text-5xl text-text-secondary/40" />
          <h3 className="text-lg font-bold text-text-primary">No Live Kits in this Warehouse</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            This warehouse has no active combo kits enabled in <strong>Warehouse Kit Activations</strong>.
            Activate combo kits first to configure OEM and Supplier partner products.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {kits.map((kit) => {
            const kId = kit.id || kit._id;
            const isSavingThis = savingKitId === kId;
            const isSavedSuccess = savedSuccessMap[kId];
            const products = kit.products || [];

            // Compute kit-level completion
            let kitMappedCount = 0;
            products.forEach((p) => {
              if (isComponentMappedInForm(kId, p.component_key)) {
                kitMappedCount += 1;
              }
            });
            const isKitComplete = products.length > 0 && kitMappedCount === products.length;

            return (
              <div
                key={kId}
                className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden transition-all"
              >
                {/* Kit Header */}
                <div className="p-5 border-b border-border bg-linear-to-r from-primary/5 via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {kit.kit_image ? (
                      <img
                        src={kit.kit_image}
                        alt={kit.name}
                        className="w-14 h-14 rounded-xl object-cover border border-border shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <FaBoxes size={22} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-text-primary tracking-tight">
                          {kit.name}
                        </h3>
                        {kit.capacity > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {kit.capacity} kW
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-bg text-text-secondary border border-border">
                          {kit.category_name} • {kit.type_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-xs text-text-secondary">
                        <span>
                          Kit Dedicated Products: <strong>{products.length} Items</strong>
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            isKitComplete ? "text-emerald-500" : "text-amber-500"
                          }`}
                        >
                          {kitMappedCount}/{products.length} Products Assigned
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save Kit Button */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                        isKitComplete
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {isKitComplete ? (
                        <>
                          <FaCheckCircle size={12} /> All Products Mapped
                        </>
                      ) : (
                        <>
                          <FaExclamationTriangle size={12} /> {products.length - kitMappedCount} Pending
                        </>
                      )}
                    </span>

                    <Button
                      variant={isSavedSuccess ? "success" : "primary"}
                      size="sm"
                      onClick={() => handleSaveKit(kit)}
                      loading={isSavingThis}
                      disabled={isSavingThis}
                      leftIcon={isSavedSuccess ? <FaCheck /> : <FaSave />}
                      className="px-4 text-xs font-bold shadow-2xs"
                    >
                      {isSavedSuccess ? "Saved!" : "Save Kit Settings"}
                    </Button>
                  </div>
                </div>

                {/* Kit Products Grid */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center justify-between">
                    <span>Dedicated Products & Partner Assignments:</span>
                    <span className="text-[11px] font-normal text-text-muted">
                      Assign either an OEM Partner or a Supplier for each product.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {products.map((prod, pIdx) => {
                      const compKey = prod.component_key;
                      const formItem = kitFormState[kId]?.[compKey] || {
                        partner_type: "oem_partner",
                        partner_id: "",
                        notes: ""
                      };

                      const currentPartnerType = formItem.partner_type || "oem_partner";
                      const isMapped = Boolean(formItem.partner_id);

                      // Component type styling
                      const isPanel = prod.component_type === "panel";
                      const isInverter = prod.component_type === "inverter";
                      const isBos = prod.component_type === "bos_kit";

                      return (
                        <div
                          key={compKey || pIdx}
                          className={`p-4 rounded-xl border transition-all ${
                            isMapped
                              ? "bg-bg/40 border-border hover:border-primary/40"
                              : "bg-amber-500/5 border-amber-500/30"
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                            {/* Product Info */}
                            <div className="flex items-start gap-3.5 min-w-0 lg:w-5/12">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.product_name}
                                  className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-border shrink-0 shadow-2xs"
                                />
                              ) : (
                                <div
                                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                                    isPanel
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                      : isInverter
                                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  }`}
                                >
                                  {isPanel ? (
                                    <FaSun size={20} />
                                  ) : isInverter ? (
                                    <FaBolt size={20} />
                                  ) : (
                                    <FaShieldAlt size={18} />
                                  )}
                                </div>
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2 py-0.2 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                      isPanel
                                        ? "bg-amber-500/10 text-amber-500"
                                        : isInverter
                                        ? "bg-blue-500/10 text-blue-500"
                                        : "bg-emerald-500/10 text-emerald-500"
                                    }`}
                                  >
                                    {isPanel ? "Solar Panel" : isInverter ? "Inverter" : "BOS Kit"}
                                  </span>

                                  {prod.subtype_name && (
                                    <span className="text-[11px] text-text-muted font-medium">
                                      • {prod.subtype_name}
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-bold text-sm text-text-primary tracking-tight truncate">
                                  {prod.product_name}
                                </h4>

                                <div className="flex items-center gap-2 text-xs text-text-secondary pt-0.5">
                                  {prod.sku_code && (
                                    <span className="font-mono bg-surface px-1.5 py-0.2 rounded border border-border text-[11px]">
                                      {prod.sku_code}
                                    </span>
                                  )}
                                  <span className="font-bold text-text-primary">
                                    Qty: {prod.quantity}
                                  </span>
                                  {prod.brand_name && (
                                    <span className="text-text-muted">
                                      (Ref Brand: {prod.brand_name})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Partner Selection Controls: ONE unified partner per product */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-7/12 justify-end">
                              {/* 1. Partner Type Switcher */}
                              <div className="space-y-1 shrink-0">
                                <span className="block text-[10px] font-black uppercase tracking-wider text-text-secondary">
                                  Partner Type:
                                </span>
                                <div className="inline-flex rounded-xl p-1 bg-surface border border-border gap-1 shadow-2xs w-full sm:w-auto">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleFieldChange(kId, compKey, "partner_type", "oem_partner");
                                      handleFieldChange(kId, compKey, "partner_id", "");
                                    }}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                      currentPartnerType === "oem_partner"
                                        ? "bg-blue-600 text-white shadow-2xs font-black"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg"
                                    }`}
                                  >
                                    <FaHandshake size={12} />
                                    <span>OEM Partner</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleFieldChange(kId, compKey, "partner_type", "supplier");
                                      handleFieldChange(kId, compKey, "partner_id", "");
                                    }}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                      currentPartnerType === "supplier"
                                        ? "bg-emerald-600 text-white shadow-2xs font-black"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg"
                                    }`}
                                  >
                                    <FaTruck size={12} />
                                    <span>Supplier / Mfg</span>
                                  </button>
                                </div>
                              </div>

                              {/* 2. Partner Dropdown */}
                              <div className="space-y-1 flex-1 min-w-[200px]">
                                <span className="block text-[10px] font-black uppercase tracking-wider text-text-secondary">
                                  {currentPartnerType === "oem_partner"
                                    ? "Select OEM Partner:"
                                    : "Select Supplier / Manufacturer:"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={formItem.partner_id || ""}
                                    onChange={(e) =>
                                      handleFieldChange(kId, compKey, "partner_id", e.target.value)
                                    }
                                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-colors font-medium ${
                                      formItem.partner_id
                                        ? currentPartnerType === "oem_partner"
                                          ? "bg-blue-500/5 border-blue-500/50 text-text-primary font-bold"
                                          : "bg-emerald-500/5 border-emerald-500/50 text-text-primary font-bold"
                                        : "bg-bg border-border text-text-secondary"
                                    }`}
                                  >
                                    <option value="">
                                      {currentPartnerType === "oem_partner"
                                        ? "-- Choose OEM Partner --"
                                        : "-- Choose Supplier --"}
                                    </option>
                                    {(currentPartnerType === "oem_partner" ? oemPartners : suppliers).map((brand) => (
                                      <option key={brand.id || brand._id} value={brand.id || brand._id}>
                                        {brand.brand_name} {brand.is_preferred ? "★ (Cluster Preferred)" : ""}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Clear Button */}
                                  {formItem.partner_id && (
                                    <button
                                      type="button"
                                      onClick={() => handleFieldChange(kId, compKey, "partner_id", "")}
                                      className="p-2 rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                                      title="Clear selection"
                                    >
                                      <FaTimes size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 3. Status Pill */}
                              <div className="shrink-0 self-end sm:self-center pt-2 sm:pt-4">
                                {formItem.partner_id ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-success/10 text-success border border-success/20">
                                    <FaCheck size={9} />
                                    {currentPartnerType === "oem_partner" ? "OEM Assigned" : "Supplier Assigned"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    <FaExclamationTriangle size={9} />
                                    Unassigned
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
