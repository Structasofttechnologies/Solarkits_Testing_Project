import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaWarehouse,
  FaMapMarkerAlt,
  FaSlidersH,
  FaPercent,
  FaLayerGroup,
  FaEdit,
  FaChevronDown,
  FaReceipt,
  FaTags,
  FaBoxOpen,
  FaIndustry,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Loader from "@/components/Loader";
import CustomTable from "@/components/CustomTable";
import Dialog from "@/components/Dialog";
import IconButton from "@/components/IconButton";
import { authHeaderObj } from "@/app/authHeader";
import KitProductPriceBreakdown, { computeKitFinancials } from "./KitProductPriceBreakdown";
import KitTierPricingModal from "./KitTierPricingModal";

const API_URL = import.meta.env.VITE_API_URL;

export default function WarehouseMarginConfig({ moduleUniqueId }) {
  const { countryName, warehouseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [searchParams] = useSearchParams();
  const editKitId = searchParams.get("combo_kit_id");

  const urlKitIdRef = useRef(editKitId);
  const dialogOpenedRef = useRef(false);

  // Core Metadata States
  const [warehouse, setWarehouse] = useState(null);
  const [countryObj, setCountryObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKitId, setSavingKitId] = useState(null);
  const [activeTab, setActiveTab] = useState("combokit");

  // Kits & Margins lists
  const [comboKits, setComboKits] = useState([]);
  const [customizeKits, setCustomizeKits] = useState([]);
  const [marginsInput, setMarginsInput] = useState({});

  // SKU Benchmark Prices & Interactive States
  const [skuPrices, setSkuPrices] = useState({});
  const [expandedKitIds, setExpandedKitIds] = useState(new Set());
  const [viewingBreakdownKit, setViewingBreakdownKit] = useState(null);

  // Dialog State
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    kit: null,
    showcase_margin: "",
    standard_margin: "",
    gst_rate: ""
  });

  // Loose & PO Tier Pricing Modal State
  const [tierModalState, setTierModalState] = useState({
    isOpen: false,
    kit: null
  });

  // Toggle row expansion
  const toggleExpandKit = (kitId) => {
    setExpandedKitIds((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  };

  // Fetch SKU benchmark prices for this warehouse cluster
  const fetchSkuPrices = async (whId, clusterId) => {
    try {
      const clusterParam = clusterId ? `cluster_id=${clusterId}` : `warehouse_id=${whId}`;
      const res = await axios.get(
        `${API_URL}/product-sku-prices?${clusterParam}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const priceMap = res.data?.price_map || {};
      if (res.data?.data && Array.isArray(res.data.data)) {
        res.data.data.forEach((item) => {
          if (item.id) {
            const key = item.id.toString();
            if (!priceMap[key]) {
              priceMap[key] = {
                price: item.price || 0,
                price_per_watt: item.price_per_watt || 0,
                currency_code: item.currency_code || "INR"
              };
            }
          }
        });
      }
      setSkuPrices(priceMap);
    } catch (e) {
      console.error("Error fetching SKU prices:", e);
    }
  };

  // 1. Fetch specific warehouse margin lists to synchronize input map
  const fetchMargins = async (isIndia) => {
    try {
      const marginEndpoint = isIndia ? "india/company-margins" : "company-margins";
      const marginRes = await axios.get(
        `${API_URL}/solarshop/${marginEndpoint}/warehouse/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const margins = marginRes.data?.data || [];
      const inputs = {};
      margins.forEach(m => {
        if (m.combo_kit_id) {
          inputs[m.combo_kit_id] = {
            showcase_margin: m.showcase_margin !== undefined ? m.showcase_margin : 0,
            standard_margin: m.standard_margin !== undefined ? m.standard_margin : 0,
            po_margin: m.po_discounted_margin !== undefined ? m.po_discounted_margin : 0,
            gst_rate: m.gst_rate !== undefined ? m.gst_rate : "",
            loose_order_pricing: Array.isArray(m.loose_order_pricing) ? m.loose_order_pricing : [],
            po_order_pricing: Array.isArray(m.po_order_pricing) ? m.po_order_pricing : []
          };
        }
      });
      setMarginsInput(prev => ({ ...prev, ...inputs }));
    } catch (e) {
      console.error("Error fetching margins map:", e);
    }
  };

  // 2. Fetch Warehouse, Country & Kits details
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active countries
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const activeCountries = countriesRes.data?.countries || [];
      const foundCountry = activeCountries.find(
        c => c.name.toLowerCase() === countryName?.toLowerCase()
      );
      setCountryObj(foundCountry);

      // Fetch all warehouses to locate the selected warehouse details
      const warehousesRes = await axios.get(
        `${API_URL}/warehouses?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const allWarehouses = warehousesRes.data?.warehouses || [];
      const wh = allWarehouses.find(w => (w.id || w._id)?.toString() === warehouseId?.toString());
      setWarehouse(wh);

      if (wh && foundCountry) {
        const isIndia = foundCountry.iso2?.toLowerCase() === "in";

        // Fetch Combo Kits (is_custom=false)
        const comboKitsRes = await axios.get(
          `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${foundCountry.id}`,
          { headers: authHeaderObj() }
        );
        setComboKits(comboKitsRes.data?.data || []);

        // Fetch Customize Kits (is_custom=true)
        const customizeKitsRes = await axios.get(
          `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=true&country_id=${foundCountry.id}`,
          { headers: authHeaderObj() }
        );
        setCustomizeKits(customizeKitsRes.data?.data || []);

        // Fetch saved margins map
        await fetchMargins(isIndia);

        // Fetch SKU benchmark prices for this warehouse cluster
        await fetchSkuPrices(wh.id, wh.cluster_id || wh.cluster);
      }
    } catch (error) {
      console.error("Error loading margin configuration data:", error);
      if (error?.response?.status === 401) {
        dispatch(setAlert({ type: "error", message: "Session expired or unauthorized. Please log in again." }));
      } else {
        dispatch(setAlert({ type: "error", message: "Failed to load warehouse margins data" }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleUniqueId && token && warehouseId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleUniqueId, token, warehouseId, countryName]);

  // Open Edit popup dialog
  const handleOpenEditDialog = (row) => {
    const entry = marginsInput[row.id] || { showcase_margin: 0, standard_margin: 0, po_margin: 0, gst_rate: "" };
    setDialogState({
      isOpen: true,
      kit: row,
      showcase_margin: entry.showcase_margin,
      standard_margin: entry.standard_margin,
      gst_rate: entry.gst_rate
    });
  };

  useEffect(() => {
    if (!urlKitIdRef.current) return;
    if (dialogOpenedRef.current) return;
    if (loading) return;
    if (comboKits.length === 0 && customizeKits.length === 0) return;

    let foundKit = comboKits.find((k) => (k.id || k._id) === urlKitIdRef.current);
    let tab = "combokit";

    if (!foundKit) {
      foundKit = customizeKits.find((k) => (k.id || k._id) === urlKitIdRef.current);
      tab = "customizekit";
    }

    if (foundKit) {
      setActiveTab(tab);
      handleOpenEditDialog(foundKit);
      dialogOpenedRef.current = true;
    }
  }, [loading, comboKits, customizeKits, marginsInput]);

  // 3. Save Margin handler on a per-kit basis
  const handleSaveMargin = async (e) => {
    if (e) e.preventDefault();
    if (!warehouse || !countryObj || !dialogState.kit) return;

    const kitId = dialogState.kit.id;
    const displayVal = dialogState.showcase_margin !== "" ? Number(dialogState.showcase_margin) : 0;
    const standardVal = dialogState.standard_margin !== "" ? Number(dialogState.standard_margin) : 0;
    const gstVal = dialogState.gst_rate !== "" ? Number(dialogState.gst_rate) : null;

    if (displayVal < 0 || standardVal < 0) {
      dispatch(setAlert({ type: "warning", message: "Margin percentages must be 0 or a positive number" }));
      return;
    }

    if (standardVal > displayVal) {
      dispatch(setAlert({ type: "warning", message: "Standard Sales Margin cannot exceed Display Margin" }));
      return;
    }

    setSavingKitId(kitId);
    try {
      const isIndia = countryObj.iso2?.toLowerCase() === "in";
      const endpointBase = isIndia ? "india/company-margins" : "company-margins";

      const payload = {
        country_id: warehouse.country_id,
        state_id: warehouse.state_id,
        cluster_id: warehouse.cluster_id || warehouse.cluster,
        warehouse_id: warehouse.id,
        combo_kit_id: kitId,
        // API field names kept backward-compatible
        showcase_margin: displayVal,
        standard_margin: standardVal,
        po_discounted_margin: 0,
        gst_rate: gstVal
      };

      const response = await axios.post(
        `${API_URL}/solarshop/${endpointBase}/save?unique_id=${moduleUniqueId}&req_for=add`,
        payload,
        { headers: authHeaderObj() }
      );

      if (response.data.status === "success") {
        dispatch(setAlert({ type: "success", message: "Margins saved successfully" }));
        setDialogState((prev) => ({ ...prev, isOpen: false }));
        await fetchMargins(isIndia);
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (error) {
      console.error("Error saving warehouse kit margin details:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to save margin"
      }));
    } finally {
      setSavingKitId(null);
    }
  };

  if (loading) {
    return <Loader text="Loading configurations..." />;
  }

  if (!warehouse) {
    return (
      <div className="card p-12 text-center border-2 border-dashed border-border flex flex-col justify-center items-center gap-4">
        <FaWarehouse className="text-4xl text-text-muted opacity-30" />
        <h3 className="text-lg font-black text-text-primary">Warehouse Not Found</h3>
        <Button onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/company-margin`)} variant="secondary" className="rounded-xl">
          Back to List
        </Button>
      </div>
    );
  }

  // Table Headers definition matching CustomTable expectations
  const tableHeaders = [
    {
      key: "name",
      accessor: "name",
      label: "Kit Name & Components",
      width: "28%"
    },
    {
      key: "blueprint",
      accessor: "solar_kit_id",
      label: "Solar Kit Blueprint",
      width: "16%"
    },
    {
      key: "capacity",
      accessor: "capacity",
      label: "Capacity",
      width: "8%"
    },
    {
      key: "base_cost",
      accessor: "id",
      label: "Kit Base Cost",
      align: "right",
      width: "12%"
    },
    {
      key: "showcase_margin",
      accessor: "id",
      label: "Display Margin",
      width: "10%"
    },
    {
      key: "standard_margin",
      accessor: "id",
      label: "Standard Sales Margin",
      width: "10%"
    },
    {
      key: "gst_rate",
      accessor: "id",
      label: "GST Rate",
      width: "8%"
    },
    {
      key: "final_price",
      accessor: "id",
      label: "Final Kit Price",
      align: "right",
      width: "12%"
    },
    {
      key: "actions",
      accessor: "id",
      label: "Actions",
      align: "right",
      width: "10%"
    }
  ];

  // Render row with expand accordion support
  const renderKitRow = (row, index) => {
    const kitId = row.id || row._id;
    const isExpanded = expandedKitIds.has(kitId);
    const entry = marginsInput[kitId] || { showcase_margin: 0, standard_margin: 0, po_margin: 0, gst_rate: "" };
    const financials = computeKitFinancials(row, skuPrices, entry);
    const gstValue = entry.gst_rate;
    const hasGst = gstValue !== undefined && gstValue !== null && gstValue !== "";
    const totalProductsCount = (row.base_components?.length || 0) + (row.bos_kits?.length || 0);
    const loosePricing = Array.isArray(entry.loose_order_pricing) ? entry.loose_order_pricing : [];
    const poPricing = Array.isArray(entry.po_order_pricing) ? entry.po_order_pricing : [];
    const hasTiers = loosePricing.length > 0 || poPricing.length > 0;

    return (
      <React.Fragment key={kitId || index}>
        <motion.tr
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.03 }}
          className={`group transition-colors duration-200 border-b border-border/60 ${
            isExpanded ? "bg-primary/[0.04]" : "hover:bg-primary/[0.02]"
          }`}
        >
          {/* Kit Name & Expand toggle */}
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleExpandKit(kitId)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isExpanded
                    ? "bg-primary text-white shadow-xs rotate-180"
                    : "bg-surface-hover hover:bg-primary/10 text-text-muted hover:text-primary border border-border/80"
                }`}
                title={isExpanded ? "Collapse product price list" : "Expand product price list"}
              >
                <FaChevronDown size={11} />
              </button>
              <div>
                <span className="font-black text-xs text-text-primary uppercase tracking-wide block leading-snug">
                  {row.name || "N/A"}
                </span>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <span className="text-[10px] text-text-muted font-bold">
                    {totalProductsCount} configured products
                  </span>
                  <span className="text-text-muted text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => toggleExpandKit(kitId)}
                    className="text-[10px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {isExpanded ? "Hide Price List ▲" : "View Price List ▼"}
                  </button>
                  <span className="text-text-muted text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => setTierModalState({ isOpen: true, kit: row })}
                    className={`text-[10px] font-bold hover:underline cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                      hasTiers
                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                        : "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                    }`}
                    title="Configure Separate Pricing for Loose & PO Orders"
                  >
                    <FaTags size={10} className="text-amber-600" />
                    {hasTiers ? (
                      <span>
                        Tiers: <strong className="text-sky-700">{loosePricing.length} Loose</strong> | <strong className="text-amber-700">{poPricing.length} PO</strong>
                      </span>
                    ) : (
                      <span>Set Loose & PO Pricing</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </td>

          {/* Blueprint */}
          <td className="px-5 py-4">
            <span className="font-bold text-xs text-text-secondary uppercase">
              {row.solar_kit_id?.name || "N/A"}
            </span>
          </td>

          {/* Capacity */}
          <td className="px-5 py-4">
            <span className="font-bold text-xs text-text-secondary bg-surface-hover px-2.5 py-1 rounded-lg border border-border/50">
              {row.capacity || 0} kW
            </span>
          </td>

          {/* Kit Base Hardware Cost */}
          <td className="px-5 py-4 text-right">
            <div className="flex flex-col items-end">
              <span className="font-mono font-black text-xs text-text-primary">
                ₹{Number(financials.totalBaseCost).toLocaleString("en-IN")}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 border ${
                  financials.allPriced
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                }`}
              >
                {financials.allPriced ? "All Priced ✓" : `${financials.pricedCount}/${financials.totalCount} Priced`}
              </span>
            </div>
          </td>

          {/* Display Margin */}
          <td className="px-5 py-4">
            <span className="font-bold text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
              {Number(entry.showcase_margin).toFixed(2)}%
            </span>
          </td>

          {/* Standard Sales Margin */}
          <td className="px-5 py-4">
            <span className="font-bold text-xs text-text-secondary bg-surface-hover px-2.5 py-1 rounded-lg border border-border/40">
              {Number(entry.standard_margin).toFixed(2)}%
            </span>
          </td>

          {/* GST Rate */}
          <td className="px-5 py-4">
            <span
              className={`font-bold text-xs px-2.5 py-1 rounded-lg border ${
                hasGst ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {hasGst ? `${Number(gstValue).toFixed(2)}%` : "Not set"}
            </span>
          </td>

          {/* Final Kit Price */}
          <td className="px-5 py-4 text-right">
            <div className="flex flex-col items-end">
              <span className="font-mono font-black text-xs text-primary">
                ₹{Number(financials.totalWithGst).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[9px] text-text-muted font-bold mt-0.5">
                {hasGst ? `Incl. ${Number(gstValue).toFixed(1)}% GST` : "Excl. GST"}
              </span>
            </div>
          </td>

          {/* Actions */}
          <td className="px-5 py-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <IconButton
                onClick={() => setViewingBreakdownKit(row)}
                variant="secondary"
                size="sm"
                tooltip="View Product Price List"
              >
                <FaReceipt size={13} />
              </IconButton>
              <IconButton
                onClick={() => setTierModalState({ isOpen: true, kit: row })}
                variant="secondary"
                size="sm"
                tooltip="Configure Loose & PO Pricing Tiers"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/15 border-amber-500/25"
              >
                <FaTags size={13} />
              </IconButton>
              <IconButton
                onClick={() => handleOpenEditDialog(row)}
                variant="primary"
                size="sm"
                tooltip="Configure Margins"
              >
                <FaEdit size={13} />
              </IconButton>
            </div>
          </td>
        </motion.tr>

        {/* Expandable Product Price Breakdown Table */}
        {isExpanded && (
          <tr className="bg-surface-hover/20 border-b-2 border-primary/20">
            <td colSpan={9} className="p-4 sm:p-5">
              <KitProductPriceBreakdown
                kit={row}
                skuPrices={skuPrices}
                margins={entry}
                currencySymbol="₹"
                onConfigureTiers={(targetKit) => setTierModalState({ isOpen: true, kit: targetKit })}
              />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header section with active country info & Back button with premium styling */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
        <div className="relative px-6 py-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/company-margin`)}
                variant="secondary"
                className="w-10 h-10 p-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm hover:scale-105 transition-transform shrink-0"
              >
                <FaArrowLeft />
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 text-white shrink-0">
                  <FaSlidersH className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight">
                    Configure Warehouse Margins
                  </h1>
                  <p className="text-white/80 text-xs mt-0.5 font-bold">
                    Configure Display and Standard Sales margin percentages on a per-kit basis.
                  </p>
                </div>
              </div>
            </div>

            {countryObj && (
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shrink-0 w-fit">
                <ReactCountryFlag
                  countryCode={countryObj.iso2}
                  svg
                  className="w-5 h-5 rounded-sm object-cover"
                />
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {countryObj.name} Market
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warehouse Detail Header Card */}
      <div className="card p-6 border-l-4 border-l-primary shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">Warehouse Code</span>
          <span className="font-black text-text-primary text-sm flex items-center gap-2 mt-1">
            <FaWarehouse className="text-primary opacity-60" size={14} />
            {warehouse.warehouse_code}
          </span>
        </div>
        <div className="md:col-span-2">
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">Address</span>
          <span className="font-semibold text-text-secondary text-xs mt-1 block">
            {warehouse.address} (PIN: {warehouse.pincode || "N/A"})
          </span>
        </div>
        <div>
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">State & Cluster</span>
          <span className="font-bold text-text-secondary text-xs flex flex-col gap-0.5 mt-1">
            <span className="flex items-center gap-1"><FaMapMarkerAlt className="text-primary/50 text-[10px]" /> {warehouse.state}</span>
            <span className="text-text-muted pl-3.5">Cluster: <strong>{warehouse.cluster || "N/A"}</strong></span>
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col">
        <div className="flex border-b border-border bg-surface-hover/30 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab("combokit")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none outline-none cursor-pointer ${activeTab === "combokit"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-text-secondary hover:bg-surface-hover"
              }`}
          >
            <FaLayerGroup size={14} />
            Combo kits
          </button>
          <button
            onClick={() => setActiveTab("customizekit")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none outline-none cursor-pointer ${activeTab === "customizekit"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-text-secondary hover:bg-surface-hover"
              }`}
          >
            <FaSlidersH size={14} />
            Customized kits
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="p-6">
          {activeTab === "combokit" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Combo Kit Margins</h3>
                <p className="text-xs text-text-muted mt-1 font-bold">Configure Display and Standard Sales margin percentages specifically applied to each Combo Kit definition.</p>
              </div>
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                <CustomTable
                  headers={tableHeaders}
                  data={comboKits}
                  loading={loading}
                  renderRow={renderKitRow}
                  emptyMessage="No configured combo kits found for this country context."
                />
              </div>
            </div>
          )}

          {activeTab === "customizekit" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Customized Kit Margins</h3>
                <p className="text-xs text-text-muted mt-1 font-bold">Configure Display and Standard Sales margin percentages specifically applied to each customized/custom kit combination.</p>
              </div>
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                <CustomTable
                  headers={tableHeaders}
                  data={customizeKits}
                  loading={loading}
                  renderRow={renderKitRow}
                  emptyMessage="No configured custom/customize kits found for this country context."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configure Margins Popup Dialog */}
      <Dialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        title="Configure Kit Margins"
        size="xl"
      >
        {dialogState.kit && (
          <form onSubmit={handleSaveMargin} className="space-y-6 pt-2">
            {/* Kit Details Header (Read-Only) */}
            <div className="bg-surface-hover/50 p-4 border border-border rounded-xl space-y-2 animate-in fade-in zoom-in duration-300">
              <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">Target Kit Details</span>
              <div className="flex flex-col gap-1">
                <span className="font-black text-text-primary text-sm uppercase">
                  {dialogState.kit.name}
                </span>
                <span className="text-xs text-text-secondary font-bold">
                  Blueprint: {dialogState.kit.solar_kit_id?.name || "N/A"} ({dialogState.kit.capacity || 0} kW)
                </span>
              </div>
            </div>

            {/* Margins Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Display Margin */}
              <CustomInput
                label="Display Margin (%) *"
                type="number"
                min="0"
                step="0.01"
                value={dialogState.showcase_margin}
                onChange={(e) => setDialogState((prev) => ({ ...prev, showcase_margin: e.target.value }))}
                placeholder="0.00"
                prefix={<FaPercent className="text-text-muted text-[10px]" />}
              />

              {/* Standard Sales Margin */}
              <CustomInput
                label="Standard Sales Margin (%) *"
                type="number"
                min="0"
                step="0.01"
                value={dialogState.standard_margin}
                onChange={(e) => setDialogState((prev) => ({ ...prev, standard_margin: e.target.value }))}
                placeholder="0.00"
                prefix={<FaPercent className="text-text-muted text-[10px]" />}
              />
            </div>

            {/* GST Rate */}
            <div className="space-y-1.5">
              <CustomInput
                label="Product GST Rate (%) *"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={dialogState.gst_rate}
                onChange={(e) => setDialogState((prev) => ({ ...prev, gst_rate: e.target.value }))}
                placeholder="e.g. 13.8, 18, 12, 5"
                prefix={<FaPercent className="text-text-muted text-[10px]" />}
                helperText="Dynamic GST percentage applied specifically to this product in this warehouse."
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-text-muted font-bold">Quick Presets:</span>
                {[5, 12, 13.8, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDialogState((prev) => ({ ...prev, gst_rate: String(rate) }))}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                      Number(dialogState.gst_rate) === rate
                        ? "bg-primary text-white border-primary shadow-xs scale-105"
                        : "bg-surface-hover/80 text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Live Pricing Breakdown Preview */}
            <div className="pt-2">
              <KitProductPriceBreakdown
                kit={dialogState.kit}
                skuPrices={skuPrices}
                margins={{
                  showcase_margin: dialogState.showcase_margin,
                  standard_margin: dialogState.standard_margin,
                  gst_rate: dialogState.gst_rate
                }}
                currencySymbol="₹"
                showTitle={false}
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={savingKitId !== null}
                className="flex-1 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs"
              >
                Save Margins
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Full Kit Product Price List & Breakdown Modal */}
      <Dialog
        isOpen={!!viewingBreakdownKit}
        onClose={() => setViewingBreakdownKit(null)}
        title="Kit Product Pricing Breakdown"
        size="xl"
      >
        {viewingBreakdownKit && (
          <div className="space-y-4 pt-1">
            <KitProductPriceBreakdown
              kit={viewingBreakdownKit}
              skuPrices={skuPrices}
              margins={marginsInput[viewingBreakdownKit.id] || {}}
              currencySymbol="₹"
              showTitle={true}
              onConfigureTiers={(targetKit) => {
                setViewingBreakdownKit(null);
                setTierModalState({ isOpen: true, kit: targetKit });
              }}
            />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    const targetKit = viewingBreakdownKit;
                    setViewingBreakdownKit(null);
                    handleOpenEditDialog(targetKit);
                  }}
                  className="rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider w-full sm:w-auto"
                >
                  <FaEdit size={12} />
                  Configure Margins
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const targetKit = viewingBreakdownKit;
                    setViewingBreakdownKit(null);
                    setTierModalState({ isOpen: true, kit: targetKit });
                  }}
                  className="rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 w-full sm:w-auto"
                >
                  <FaTags size={12} />
                  Configure Tier Pricing
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={() => setViewingBreakdownKit(null)}
                className="rounded-xl text-xs font-bold w-full sm:w-auto"
              >
                Close Price List
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Loose & PO Order Tier Pricing Modal */}
      <KitTierPricingModal
        isOpen={tierModalState.isOpen}
        onClose={() => setTierModalState({ isOpen: false, kit: null })}
        kit={tierModalState.kit}
        warehouse={warehouse}
        countryObj={countryObj}
        moduleUniqueId={moduleUniqueId}
        initialMargins={tierModalState.kit ? (marginsInput[tierModalState.kit.id || tierModalState.kit._id] || {}) : {}}
        skuPrices={skuPrices}
        onSaved={async (savedData) => {
          const kitId = tierModalState.kit?.id || tierModalState.kit?._id;
          if (kitId) {
            setMarginsInput((prev) => ({
              ...prev,
              [kitId]: {
                ...(prev[kitId] || {}),
                gst_rate: savedData.gst_rate !== undefined ? savedData.gst_rate : prev[kitId]?.gst_rate,
                loose_order_pricing: savedData.loose_order_pricing,
                po_order_pricing: savedData.po_order_pricing
              }
            }));
          }
          const isIndia = countryObj?.iso2?.toLowerCase() === "in";
          await fetchMargins(isIndia);
        }}
      />
    </div>
  );
}
