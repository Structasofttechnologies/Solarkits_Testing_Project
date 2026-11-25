import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FaFileInvoice, FaBuilding, FaTruck, FaWarehouse, FaTimes,
  FaCheckCircle, FaCalendarAlt, FaShieldAlt, FaInfoCircle, FaBoxes, FaListUl,
  FaIndustry, FaSearch, FaStar, FaHandshake, FaChevronDown, FaTag
} from "react-icons/fa";
import Dialog from "../Dialog";
import Button from "../Button";
import CustomInput from "../CustomInput";
import { getProcurementPartners } from "../../api/accounts";

export default function PurchaseIndentModal({
  isOpen,
  onClose,
  selectedOrder,
  selectedBatch,
  bomItem,
  destinationWarehouse,
  procurementSettings,
  onSubmit,
  loading
}) {
  const [supplierName, setSupplierName] = useState("");
  const [supplierBrand, setSupplierBrand] = useState("");
  const [supplierGst, setSupplierGst] = useState("");
  const [isOemPartner, setIsOemPartner] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [procureQuantity, setProcureQuantity] = useState(1);
  const [unitRate, setUnitRate] = useState(0);
  const [gstRate, setGstRate] = useState(13.8);
  const [fulfilmentMethod, setFulfilmentMethod] = useState("Company Pickup");
  const [supplierWarehouseAddress, setSupplierWarehouseAddress] = useState("");
  const [transportCost, setTransportCost] = useState(0);
  const [advancePercentage, setAdvancePercentage] = useState(30);
  const [productionTatDays, setProductionTatDays] = useState(5);
  const [supplyTatDays, setSupplyTatDays] = useState(3);
  const [paymentTerms, setPaymentTerms] = useState("30% Advance, 70% Before Dispatch");
  const [expectedPickupDate, setExpectedPickupDate] = useState("");
  const [expectedDispatchDate, setExpectedDispatchDate] = useState("");
  const [expectedInwardDate, setExpectedInwardDate] = useState("");

  // All suppliers & OEM partners list from network master database
  const [sourcingPartners, setSourcingPartners] = useState({
    oem_partners: [],
    suppliers: [],
    catalog_brands: [],
    all_partners: []
  });
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partnerFilter, setPartnerFilter] = useState("all"); // 'all' | 'oem' | 'supplier' | 'mapped'
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Multi-item support for Complete BOS Kit (all items under 1 PI)
  const [multiItems, setMultiItems] = useState([]);

  // Fetch all network partners when modal mounts
  useEffect(() => {
    let isMounted = true;
    const fetchPartners = async () => {
      try {
        setLoadingPartners(true);
        const res = await getProcurementPartners();
        if (isMounted && res?.status === "success" && res?.data) {
          setSourcingPartners(res.data);
        }
      } catch (err) {
        console.warn("Could not load sourcing partners list:", err);
      } finally {
        if (isMounted) setLoadingPartners(false);
      }
    };
    fetchPartners();
    return () => {
      isMounted = false;
    };
  }, []);

  // Existing Benchmark Cost configured in Admin
  const benchmarkCost = useMemo(() => {
    if (bomItem?.benchmark_cost) return bomItem.benchmark_cost;
    if (bomItem?.sub_items && bomItem.sub_items.length > 0) {
      return bomItem.sub_items.reduce((acc, sub) => acc + (Number(sub.benchmark_cost || sub.unit_rate) || 0) * (Number(sub.qty_per_kit) || 1), 0);
    }
    return bomItem?.unit_rate || (bomItem?.component_type === "panel" ? 6875 : bomItem?.component_type === "inverter" ? 32000 : 0);
  }, [bomItem]);

  // Combine API partners with bomItem eligible partners
  const combinedPartners = useMemo(() => {
    const list = [];
    const seenNames = new Set();

    // 1. First add eligible partners from BOM item (Warehouse-mapped)
    const eligible = bomItem?.eligible_partners || [];
    eligible.forEach((ep) => {
      const name = ep.name || ep.brand_name;
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        list.push({
          id: ep.id || `mapped_${name}`,
          name: name,
          brand_name: ep.brand_name || (ep.is_oem ? "SOLARKITS" : name),
          is_oem: Boolean(ep.is_oem),
          category: ep.is_oem ? "oem" : "supplier",
          type: ep.is_oem ? "OEM Partner (SOLARKITS Brand)" : "Supplier Partner (Own Brand)",
          is_warehouse_mapped: true,
          gst_number: ep.gst_number || ep.gst || null,
          address: ep.address || null
        });
      }
    });

    // 2. Add all OEM partners from API
    (sourcingPartners.oem_partners || []).forEach((p) => {
      const name = p.name || p.brand_name;
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        list.push({
          ...p,
          is_warehouse_mapped: false
        });
      }
    });

    // 3. Add all Suppliers from API
    (sourcingPartners.suppliers || []).forEach((p) => {
      const name = p.name || p.brand_name;
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        list.push({
          ...p,
          is_warehouse_mapped: false
        });
      }
    });

    // 4. Add catalog brands
    (sourcingPartners.catalog_brands || []).forEach((p) => {
      const name = p.name || p.brand_name;
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        list.push({
          ...p,
          is_warehouse_mapped: false
        });
      }
    });

    return list;
  }, [bomItem, sourcingPartners]);

  // Group partners for mapped filter
  const mappedPartners = useMemo(() => {
    return combinedPartners.filter((p) => p.is_warehouse_mapped);
  }, [combinedPartners]);

  // Extract distinct brand names for clean brand filter chips
  const distinctBrands = useMemo(() => {
    const brandMap = new Map();
    combinedPartners.forEach((p) => {
      let b = (p.brand_name || p.name || "").trim();
      if (p.is_oem) {
        b = "SOLARKITS (OEM)";
      } else {
        b = b.replace(/\s+(llp|private limited|pvt ltd|pvt\. ltd\.|limited|ltd)\.?$/i, "").trim();
      }
      if (b) {
        brandMap.set(b, (brandMap.get(b) || 0) + 1);
      }
    });

    const sorted = Array.from(brandMap.keys()).sort((a, b) => {
      if (a.includes("SOLARKITS")) return -1;
      if (b.includes("SOLARKITS")) return 1;
      return a.localeCompare(b);
    });

    return sorted;
  }, [combinedPartners]);

  // Unified, filtered partner list based on Category tab, Brand chip, and Search query
  const filteredPartners = useMemo(() => {
    return combinedPartners.filter((p) => {
      // 1. Category tab filter
      if (partnerFilter === "mapped" && !p.is_warehouse_mapped) return false;
      if (partnerFilter === "oem" && !p.is_oem) return false;
      if (partnerFilter === "supplier" && p.is_oem) return false;

      // 2. Brand chip filter
      if (selectedBrandFilter !== "all") {
        if (selectedBrandFilter === "SOLARKITS (OEM)") {
          if (!p.is_oem && !(p.brand_name || "").toLowerCase().includes("solarkits")) return false;
        } else {
          const brandText = `${p.brand_name || ""} ${p.name || ""}`.toLowerCase();
          if (!brandText.includes(selectedBrandFilter.toLowerCase())) return false;
        }
      }

      // 3. Search query
      if (partnerSearch.trim()) {
        const q = partnerSearch.toLowerCase().trim();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchBrand = (p.brand_name || "").toLowerCase().includes(q);
        const matchGst = (p.gst_number || "").toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchGst) return false;
      }

      return true;
    });
  }, [combinedPartners, partnerFilter, selectedBrandFilter, partnerSearch]);

  const filteredMapped = useMemo(() => filteredPartners.filter((p) => p.is_warehouse_mapped), [filteredPartners]);
  const filteredOem = useMemo(() => filteredPartners.filter((p) => p.is_oem && !p.is_warehouse_mapped), [filteredPartners]);
  const filteredSuppliers = useMemo(() => filteredPartners.filter((p) => !p.is_oem && !p.is_warehouse_mapped), [filteredPartners]);

  useEffect(() => {
    if (bomItem) {
      // Auto-deducted supplier quantity (after warehouse stock deduction)
      const kitQty = bomItem.supplier_quantity !== undefined
        ? bomItem.supplier_quantity
        : Math.max(1, (bomItem.required_quantity || 1) - (bomItem.deducted_warehouse_stock || 0));

      setProcureQuantity(kitQty);
      setUnitRate(bomItem.unit_rate || bomItem.benchmark_cost || (bomItem.component_type === "panel" ? 6875 : bomItem.component_type === "inverter" ? 32000 : 0));

      // Synchronize TAT and Transport Cost strictly from Admin configuration
      if (procurementSettings) {
        if (procurementSettings.production_tat_days) setProductionTatDays(Number(procurementSettings.production_tat_days));
        if (procurementSettings.supply_tat_days) setSupplyTatDays(Number(procurementSettings.supply_tat_days));
        if (procurementSettings.estimated_transport_cost !== undefined) setTransportCost(Number(procurementSettings.estimated_transport_cost));
      } else {
        setProductionTatDays(5);
        setSupplyTatDays(3);
        setTransportCost(0);
      }

      if (bomItem.sub_items && bomItem.sub_items.length > 0) {
        setMultiItems(
          bomItem.sub_items.map((sub) => {
            const itemQty = (sub.qty_per_kit || 1) * kitQty;
            const rate = (sub.unit_rate !== undefined && sub.unit_rate > 0) ? sub.unit_rate : (sub.benchmark_cost || 0);
            const subtotal = itemQty * rate;
            const gst = 13.8;
            const tax = Math.round((subtotal * gst) / 100);
            return {
              sku_id: sub.sku_id || null,
              sku_code: sub.sku_code,
              product_name: sub.product_name,
              category: sub.category,
              quantity: itemQty,
              unit_rate: rate,
              benchmark_cost: sub.benchmark_cost || sub.unit_rate || rate,
              unit: sub.unit || "Sets",
              gst_rate: gst,
              tax_amount: tax,
              total_value: subtotal + tax
            };
          })
        );
      } else {
        setMultiItems([]);
      }

      const defaultPartner = bomItem.selected_partner || bomItem.eligible_partners?.[0];
      if (defaultPartner) {
        setSelectedPartnerId(defaultPartner.id || defaultPartner.name || "");
        setSupplierName(defaultPartner.name || "");
        setSupplierBrand(defaultPartner.brand_name || defaultPartner.name || "");
        setIsOemPartner(Boolean(defaultPartner.is_oem));
        if (defaultPartner.gst_number || defaultPartner.gst) {
          setSupplierGst(defaultPartner.gst_number || defaultPartner.gst);
        }
      }

      // Default dates: Expected Inward ~ 7 days out
      const today = new Date();
      const in3Days = new Date(today.getTime() + 3 * 86400000).toISOString().split("T")[0];
      const in7Days = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
      setExpectedPickupDate(in3Days);
      setExpectedDispatchDate(in3Days);
      setExpectedInwardDate(in7Days);
    }
  }, [bomItem, procurementSettings]);

  const isMultiItem = multiItems && multiItems.length > 0;

  // Detect if any entered rate exceeds existing benchmark cost
  const isAboveBenchmark = useMemo(() => {
    if (isMultiItem) {
      return multiItems.some(it => (Number(it.unit_rate) || 0) > (Number(it.benchmark_cost) || 0));
    }
    return Number(unitRate) > Number(benchmarkCost);
  }, [isMultiItem, multiItems, unitRate, benchmarkCost]);

  // Handler when overarching Kit quantity changes
  const handleKitQuantityChange = (newQty) => {
    const validQty = Math.max(1, newQty);
    setProcureQuantity(validQty);
    if (bomItem?.sub_items && bomItem.sub_items.length > 0) {
      setMultiItems(prev =>
        prev.map(item => {
          const originalSub = bomItem.sub_items.find(s => s.sku_code === item.sku_code);
          const perKit = originalSub?.qty_per_kit || 1;
          const updatedQty = perKit * validQty;
          const subtotal = updatedQty * (Number(item.unit_rate) || 0);
          const gst = Number(item.gst_rate) || 13.8;
          const tax = Math.round((subtotal * gst) / 100);
          return {
            ...item,
            quantity: updatedQty,
            tax_amount: tax,
            total_value: subtotal + tax
          };
        })
      );
    }
  };

  const handlePartnerSelect = (partner) => {
    if (!partner) return;
    setSelectedPartnerId(partner.id || partner.name);
    setSupplierName(partner.name);
    setSupplierBrand(partner.brand_name || (partner.is_oem ? "SOLARKITS" : partner.name));
    setIsOemPartner(Boolean(partner.is_oem));
    if (partner.gst_number) {
      setSupplierGst(partner.gst_number);
    }
    if (partner.address && !supplierWarehouseAddress) {
      setSupplierWarehouseAddress(partner.address);
    }
    setIsDropdownOpen(false);
  };

  const handleSelectCustom = () => {
    setSelectedPartnerId("__custom__");
    setIsOemPartner(false);
    setIsDropdownOpen(false);
  };

  const subtotal = useMemo(() => {
    if (isMultiItem) {
      return multiItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0), 0);
    }
    return procureQuantity * unitRate;
  }, [isMultiItem, multiItems, procureQuantity, unitRate]);

  const taxAmount = useMemo(() => {
    if (isMultiItem) {
      return multiItems.reduce((acc, it) => {
        const itemSub = (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0);
        return acc + Math.round((itemSub * (Number(it.gst_rate) || 13.8)) / 100);
      }, 0);
    }
    return Math.round((subtotal * gstRate) / 100);
  }, [isMultiItem, multiItems, subtotal, gstRate]);

  const totalPiValue = subtotal + taxAmount;
  const advanceAmount = Math.round((totalPiValue * advancePercentage) / 100);
  const balanceAmount = totalPiValue - advanceAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert("Please select or enter an eligible Supplier / OEM Partner.");
      return;
    }
    if (procureQuantity <= 0) {
      alert("Procurement quantity must be greater than zero.");
      return;
    }

    const payloadItems = isMultiItem
      ? multiItems.map(it => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.unit_rate) || 0;
        const gst = Number(it.gst_rate) || 13.8;
        const itemSub = qty * rate;
        const tax = Math.round((itemSub * gst) / 100);
        return {
          sku_id: it.sku_id || null,
          sku_code: it.sku_code || "BOS-ITEM",
          product_name: it.product_name,
          parent_sku_code: bomItem?.sku_code || null,
          component_type: bomItem?.component_type || null,
          quantity: qty,
          unit_rate: rate,
          gst_rate: gst,
          tax_amount: tax,
          total_value: itemSub + tax
        };
      })
      : [
        {
          sku_id: bomItem?.sku_id || null,
          sku_code: bomItem?.sku_code || "SKU-SOLAR",
          product_name: bomItem?.product_name || "Solar Component",
          parent_sku_code: bomItem?.sku_code || null,
          component_type: bomItem?.component_type || null,
          quantity: Number(procureQuantity),
          unit_rate: Number(unitRate),
          gst_rate: Number(gstRate),
          tax_amount: taxAmount,
          total_value: totalPiValue
        }
      ];

    const payload = {
      customer_order_number: selectedOrder?.order_number || selectedBatch?.order_numbers?.[0] || "ORD-2026-COMBINED",
      customer_order_id: selectedOrder?.id || null,
      order_group_id: selectedBatch?.group_id || null,
      bom_sku_code: bomItem?.sku_code || null,
      component_type: bomItem?.component_type || null,
      supplier_id: (selectedPartnerId && selectedPartnerId !== "__custom__" && !String(selectedPartnerId).startsWith("mapped_")) ? selectedPartnerId : null,
      supplier_name: supplierName,
      supplier_brand: supplierBrand,
      supplier_gst: supplierGst,
      is_oem_partner: isOemPartner,
      destination_warehouse_id: destinationWarehouse?.id || selectedBatch?.supplier_groups?.[0]?.warehouse_id || "670000000000000000000001",
      destination_warehouse_name: destinationWarehouse?.name || "Central Warehouse",
      items: payloadItems,
      is_above_benchmark: isAboveBenchmark,
      benchmark_cost: Number(benchmarkCost) || 0,
      benchmark_total_cost: Math.round((Number(benchmarkCost) || 0) * procureQuantity * (1 + ((Number(gstRate) || 13.8) / 100))),
      requires_admin_approval: isAboveBenchmark,
      fulfilment: {
        method: fulfilmentMethod,
        supplier_warehouse_address: supplierWarehouseAddress || "Supplier Primary Works",
        transport_responsibility: fulfilmentMethod === "Company Pickup" ? "Company" : "Supplier",
        transport_cost: Number(transportCost) || 0,
        expected_pickup_date: fulfilmentMethod === "Company Pickup" ? expectedPickupDate : null,
        expected_dispatch_date: fulfilmentMethod === "Supplier Delivery" ? expectedDispatchDate : null,
        expected_inward_date: expectedInwardDate
      },
      payment_terms: `${advancePercentage}% Advance, ${100 - advancePercentage}% Before Dispatch`,
      advance_percentage: advancePercentage,
      advance_amount: advanceAmount,
      balance_percentage: 100 - advancePercentage,
      balance_amount: balanceAmount,
      production_tat_days: productionTatDays,
      supply_tat_days: supplyTatDays
    };

    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create Supplier Purchase Indent (PI)" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5 p-1 text-text-primary">

        {/* Header Banner: Order & Warehouse Context */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-primary block">
              Procurement Target
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-black text-text-primary">
                {selectedOrder ? `Order #${selectedOrder.order_number}` : `Batch #${selectedBatch?.group_id}`}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface border border-border text-text-muted font-bold">
                {selectedOrder?.customer_name || `${selectedBatch?.order_count || 1} Linked Orders`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black tracking-widest uppercase text-text-muted block">
              Destination Warehouse
            </span>
            <div className="flex items-center gap-1.5 justify-end text-sm font-bold text-text-primary mt-0.5">
              <FaWarehouse className="text-primary" />
              <span>{destinationWarehouse?.name || "Central Regional Warehouse"}</span>
            </div>
          </div>
        </div>

        {/* Product & Quantity Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FaBoxes className="text-primary text-base" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                {isMultiItem ? "BOS Kit Components & Indent Quantities" : "Product & Indent Quantity"}
              </h3>
            </div>
            <span className="text-xs font-bold text-text-muted">
              SKU: <code className="text-primary font-mono">{bomItem?.sku_code}</code>
            </span>
          </div>

          {isMultiItem ? (
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-text-primary block">{bomItem?.product_name}</span>
                  <span className="text-[10px] text-text-muted">
                    Total Required: <strong>{bomItem?.required_quantity} {bomItem?.unit}</strong> • Supplier Sourcing Qty: <strong>{bomItem?.supplier_quantity} {bomItem?.unit}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase">
                    Procure Sets (Locked):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={procureQuantity}
                    readOnly
                    disabled
                    className="w-20 py-1.5 px-2 text-center bg-bg/80 border border-border rounded-lg text-xs font-black text-text-primary opacity-80 cursor-not-allowed shadow-xs"
                    title="Procure quantity is auto-calculated and locked"
                  />
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-primary text-white text-[9px]">
                    Single Unified PI
                  </span>
                </div>
              </div>

              {/* Itemized breakdown table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xs text-[10px] uppercase font-black tracking-wider text-text-muted border-b border-border shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3">BOS Component Name</th>
                      <th className="py-2.5 px-2 text-center">SKU Code</th>
                      <th className="py-2.5 px-2 text-center">Quantity (Locked)</th>
                      <th className="py-2.5 px-2 text-right">Benchmark Cost (₹)</th>
                      <th className="py-2.5 px-2 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Subtotal (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {multiItems.map((it, idx) => {
                      const lineSub = (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0);
                      const itemAboveBm = (Number(it.unit_rate) || 0) > (Number(it.benchmark_cost) || 0);
                      return (
                        <tr key={it.sku_code || idx} className={`hover:bg-bg/40 transition-colors ${itemAboveBm ? "bg-amber-500/[0.04]" : ""}`}>
                          <td className="py-2.5 px-3 font-bold text-text-primary">
                            <div className="flex items-center gap-1.5">
                              <span>{it.product_name}</span>
                              {itemAboveBm && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  Above Benchmark
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] font-normal text-text-muted">{it.category}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[10px] text-primary">
                            {it.sku_code}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              value={it.quantity}
                              readOnly
                              disabled
                              className="w-16 py-1 px-1.5 text-center bg-bg/80 border border-border rounded-lg text-xs font-bold text-text-primary opacity-80 cursor-not-allowed"
                              title="Quantity auto-calculated from Kit count"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-text-muted font-bold">
                            ₹{Number(it.benchmark_cost || it.unit_rate).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.unit_rate}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setMultiItems(prev => prev.map((p, i) => i === idx ? { ...p, unit_rate: val } : p));
                              }}
                              className={`w-24 py-1 px-1.5 text-right bg-bg border rounded-lg text-xs font-bold text-text-primary focus:outline-hidden focus:border-primary ${itemAboveBm ? "border-amber-500 text-amber-700 bg-amber-500/5" : "border-border"
                                }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-text-primary font-mono">
                            ₹{lineSub.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isAboveBenchmark && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-start gap-2 animate-in fade-in">
                  <FaShieldAlt className="shrink-0 text-xs mt-0.5 text-amber-600" />
                  <div>
                    <span>One or more BOS components exceed the Admin Benchmark Cost.</span>
                    <span className="block text-[9px] font-normal mt-0.5 opacity-90">
                      ⚠️ Admin approval will be required before releasing this Purchase Indent.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                  Product Name
                </label>
                <div className="p-2.5 bg-bg border border-border rounded-xl text-xs font-bold text-text-primary">
                  {bomItem?.product_name || "Solar Component"}
                </div>
              </div>

              <div>
                <CustomInput
                  label="Indent Qty (Locked) 🔒"
                  type="number"
                  min="1"
                  required
                  value={procureQuantity}
                  readOnly
                  disabled
                  className="opacity-80 bg-surface-hover cursor-not-allowed font-black"
                />
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {bomItem?.deducted_warehouse_stock > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {bomItem?.required_quantity} Req − {bomItem?.deducted_warehouse_stock} Warehouse Stock = {procureQuantity} {bomItem?.unit} (Locked)
                    </span>
                  ) : (
                    <span>Total Required: {bomItem?.required_quantity} {bomItem?.unit} (Locked)</span>
                  )}
                </span>
              </div>

              <div>
                <CustomInput
                  label="Unit Rate (₹) *"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={unitRate}
                  onChange={(e) => setUnitRate(Math.max(0, parseFloat(e.target.value) || 0))}
                />
                <div className="flex items-center justify-between text-[10px] mt-1 flex-wrap gap-1">
                  <span className="text-text-muted">Excl. GST @ {gstRate}%</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    Benchmark Cost: ₹{Number(benchmarkCost).toLocaleString("en-IN")}
                  </span>
                </div>
                {isAboveBenchmark && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-start gap-1.5 animate-in fade-in">
                    <FaShieldAlt className="shrink-0 text-xs mt-0.5 text-amber-600" />
                    <div>
                      <span>Rate (₹{Number(unitRate).toLocaleString("en-IN")}) exceeds Benchmark Cost (₹{Number(benchmarkCost).toLocaleString("en-IN")}).</span>
                      <span className="block text-[9px] font-normal mt-0.5 opacity-90">
                        ⚠️ Admin Approval will be required before order release.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Supplier / OEM Selection (with Master Dropdown for All Partners) */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <FaBuilding className="text-primary text-base" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Supplier / OEM Partner Sourcing
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                <FaHandshake className="text-[10px]" /> Network Masters ({combinedPartners.length} Partners)
              </span>
            </div>
          </div>

          {/* 1. Category / Partner Type Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-[11px] font-black text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                <span>Select Supplier / OEM Partner to Buy From *</span>
                {loadingPartners && (
                  <span className="text-[9px] font-normal text-text-muted animate-pulse">
                    (Loading partners...)
                  </span>
                )}
              </label>

              {/* Category Segmented Tabs */}
              <div className="inline-flex items-center p-1 bg-surface-hover/80 border border-border rounded-xl text-xs gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPartnerFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    partnerFilter === "all"
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  All ({combinedPartners.length})
                </button>
                {mappedPartners.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPartnerFilter("mapped")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      partnerFilter === "mapped"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    <FaStar className="text-[9px]" /> Mapped ({mappedPartners.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPartnerFilter("oem")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    partnerFilter === "oem"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  }`}
                >
                  <FaIndustry className="text-[9px]" /> OEM ({combinedPartners.filter(p => p.is_oem).length})
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerFilter("supplier")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    partnerFilter === "supplier"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                  }`}
                >
                  <FaTruck className="text-[9px]" /> Suppliers ({combinedPartners.filter(p => !p.is_oem).length})
                </button>
              </div>
            </div>

            {/* 2. Brand Filter Carousel / Chips */}
            {distinctBrands.length > 1 && (
              <div className="bg-bg/60 border border-border/80 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <FaTag className="text-primary text-[9px]" /> Filter by Brand:
                  </span>
                  {selectedBrandFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedBrandFilter("all")}
                      className="text-primary font-bold hover:underline cursor-pointer"
                    >
                      Clear Brand Filter (Show All)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedBrandFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                      selectedBrandFilter === "all"
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-surface border border-border text-text-secondary hover:border-primary/40"
                    }`}
                  >
                    All Brands
                  </button>
                  {distinctBrands.map((brand) => {
                    const isSelected = selectedBrandFilter === brand;
                    const isOem = brand.includes("SOLARKITS");
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => setSelectedBrandFilter(isSelected ? "all" : brand)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? isOem
                              ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                              : "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : isOem
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                            : "bg-surface text-text-secondary border-border hover:border-primary/50 hover:text-text-primary"
                        }`}
                      >
                        {isOem ? <FaIndustry size={9} /> : <FaTag size={8} />}
                        <span>{brand}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Search & Interactive Custom Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="space-y-2">
              {/* Live Search Input */}
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none" />
                <input
                  type="text"
                  value={partnerSearch}
                  onChange={(e) => {
                    setPartnerSearch(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type to search partner, brand name, or GSTIN (e.g. Waaree, Adani, Sahjanand)..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border focus:border-primary bg-surface text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                />
                {partnerSearch && (
                  <button
                    type="button"
                    onClick={() => setPartnerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer text-xs"
                    title="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* Selector Trigger Button (Displays Current Selection) */}
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs ${
                  isDropdownOpen
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : supplierName
                    ? "border-primary/40 bg-surface hover:border-primary"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isOemPartner
                      ? "bg-purple-500/15 text-purple-600"
                      : supplierName
                      ? "bg-blue-500/15 text-blue-600"
                      : "bg-surface-hover text-text-muted"
                  }`}>
                    {isOemPartner ? <FaIndustry size={14} /> : <FaBuilding size={14} />}
                  </div>

                  <div className="min-w-0 text-left">
                    {supplierName ? (
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-text-primary truncate">{supplierName}</span>
                          {isOemPartner ? (
                            <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                              OEM Partner (Brand: SOLARKITS)
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                              Supplier (Brand: {supplierBrand || supplierName})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                          {supplierGst && <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">GST: {supplierGst}</span>}
                          {supplierWarehouseAddress && <span className="truncate max-w-[280px]">• {supplierWarehouseAddress}</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-text-muted">
                        -- Click to Browse &amp; Select Supplier / OEM Partner ({filteredPartners.length} Available) --
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    {filteredPartners.length} Available
                  </span>
                  <FaChevronDown className={`text-text-muted text-xs transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-primary" : ""}`} />
                </div>
              </div>
            </div>

            {/* Custom Dropdown Menu with Categorized Groups */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border-2 border-border/80 rounded-2xl shadow-2xl z-40 max-h-80 overflow-y-auto p-2 space-y-3.5 divide-y divide-border/40 animate-in fade-in slide-in-from-top-1">
                {/* 1. Mapped / Recommended Section */}
                {filteredMapped.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between px-2 text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FaStar className="text-amber-500" />
                        Warehouse Mapped / Recommended Partners ({filteredMapped.length})
                      </span>
                      <span className="text-[9px] font-normal text-text-muted">Pre-approved for this cluster</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredMapped.map((p) => {
                        const isSelected = supplierName === p.name;
                        return (
                          <div
                            key={p.id || p.name}
                            onClick={() => handlePartnerSelect(p)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 text-text-primary ring-1 ring-emerald-500/40"
                                : "bg-bg/40 border-border/60 hover:bg-surface-hover hover:border-emerald-500/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-text-primary">{p.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  ⭐ Mapped {p.is_oem ? "OEM" : "Supplier"}
                                </span>
                                {p.brand_name && (
                                  <span className="text-[10px] text-text-muted font-medium">Brand: {p.brand_name}</span>
                                )}
                              </div>
                              {p.gst_number && (
                                <span className="text-[9px] font-mono text-text-secondary block mt-0.5">GST: {p.gst_number}</span>
                              )}
                            </div>
                            {isSelected ? (
                              <FaCheckCircle className="text-emerald-600 shrink-0 text-sm" />
                            ) : (
                              <button type="button" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20">
                                Select
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. OEM Manufacturing Network Section */}
                {filteredOem.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between px-2 text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FaIndustry className="text-purple-600" />
                        OEM Partners (SOLARKITS Manufacturing Network) ({filteredOem.length})
                      </span>
                      <span className="text-[9px] font-normal text-text-muted">Standard Solarkits Brand Output</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredOem.map((p) => {
                        const isSelected = supplierName === p.name;
                        return (
                          <div
                            key={p.id || p.name}
                            onClick={() => handlePartnerSelect(p)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-purple-500/10 border-purple-500 text-text-primary ring-1 ring-purple-500/40"
                                : "bg-bg/40 border-border/60 hover:bg-surface-hover hover:border-purple-500/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-text-primary">{p.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  OEM Partner (Brand: SOLARKITS)
                                </span>
                              </div>
                              {p.gst_number && (
                                <span className="text-[9px] font-mono text-text-secondary block mt-0.5">GST: {p.gst_number}</span>
                              )}
                            </div>
                            {isSelected ? (
                              <FaCheckCircle className="text-purple-600 shrink-0 text-sm" />
                            ) : (
                              <button type="button" className="text-[10px] font-bold text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/20">
                                Select
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Approved Supplier Partners (Own Brand) Section */}
                {filteredSuppliers.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between px-2 text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FaTruck className="text-blue-600" />
                        Approved Supplier Partners (Brand Sourcing) ({filteredSuppliers.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredSuppliers.map((p) => {
                        const isSelected = supplierName === p.name;
                        return (
                          <div
                            key={p.id || p.name}
                            onClick={() => handlePartnerSelect(p)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500 text-text-primary ring-1 ring-blue-500/40"
                                : "bg-bg/40 border-border/60 hover:bg-surface-hover hover:border-blue-500/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-text-primary">{p.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  Brand: {p.brand_name || p.name}
                                </span>
                              </div>
                              {p.gst_number && (
                                <span className="text-[9px] font-mono text-text-secondary block mt-0.5">GST: {p.gst_number}</span>
                              )}
                            </div>
                            {isSelected ? (
                              <FaCheckCircle className="text-blue-600 shrink-0 text-sm" />
                            ) : (
                              <button type="button" className="text-[10px] font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/20">
                                Select
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredPartners.length === 0 && (
                  <div className="p-4 text-center text-xs text-text-muted space-y-2">
                    <p>No supplier or OEM partner matches your search/brand filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setPartnerFilter("all");
                        setSelectedBrandFilter("all");
                        setPartnerSearch("");
                      }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}

                {/* Custom Manual Entry Footer */}
                <div className="pt-2 px-1">
                  <button
                    type="button"
                    onClick={handleSelectCustom}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-border hover:border-primary/60 text-xs font-bold text-text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-bg/50 hover:bg-primary/5"
                  >
                    <span>✏️ Other / Unlisted Partner (Enter Details Manually Below)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form Inputs for Name and GST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <CustomInput
              label="Selected Supplier / OEM Name *"
              value={supplierName}
              onChange={(e) => {
                setSupplierName(e.target.value);
                setSelectedPartnerId("__custom__");
              }}
              placeholder="e.g. Adani Solar Works / Growatt"
              required
            />
            <CustomInput
              label="Supplier GSTIN"
              value={supplierGst}
              onChange={(e) => setSupplierGst(e.target.value)}
              placeholder="e.g. 24AAACA1234F1Z9"
            />
          </div>
        </div>

        {/* Fulfilment Method: Company Pickup vs Supplier Delivery (PART 2) */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <FaTruck className="text-primary text-base" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Supply Fulfilment Method
              </h3>
            </div>
            <span className="text-[10px] text-text-muted font-bold">
              PART 2 Compliance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Company Pickup */}
            <div
              onClick={() => setFulfilmentMethod("Company Pickup")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${fulfilmentMethod === "Company Pickup"
                  ? "bg-primary/5 border-primary shadow-xs"
                  : "bg-surface border-border hover:border-primary/40"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-text-primary">Option A: Company Pickup</span>
                {fulfilmentMethod === "Company Pickup" && <FaCheckCircle className="text-primary" />}
              </div>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                Company assigns vehicle/logistics provider to collect goods directly from supplier factory/warehouse and deliver to destination warehouse.
              </p>
            </div>

            {/* Option B: Supplier Delivery */}
            <div
              onClick={() => setFulfilmentMethod("Supplier Delivery")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${fulfilmentMethod === "Supplier Delivery"
                  ? "bg-primary/5 border-primary shadow-xs"
                  : "bg-surface border-border hover:border-primary/40"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-text-primary">Option B: Supplier Delivery</span>
                {fulfilmentMethod === "Supplier Delivery" && <FaCheckCircle className="text-primary" />}
              </div>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                Supplier arranges transport to ship directly to the selected destination warehouse. Supplier provides dispatch reference and tracking.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-1">
              <CustomInput
                label="Supplier Pickup/Dispatch Address"
                value={supplierWarehouseAddress}
                onChange={(e) => setSupplierWarehouseAddress(e.target.value)}
                placeholder="Supplier factory location / city"
              />
            </div>
            <div>
              {fulfilmentMethod === "Company Pickup" ? (
                <CustomInput
                  label="Expected Pickup Date *"
                  type="date"
                  required
                  value={expectedPickupDate}
                  onChange={(e) => setExpectedPickupDate(e.target.value)}
                />
              ) : (
                <CustomInput
                  label="Expected Dispatch Date *"
                  type="date"
                  required
                  value={expectedDispatchDate}
                  onChange={(e) => setExpectedDispatchDate(e.target.value)}
                />
              )}
            </div>
            <div>
              <CustomInput
                label="Expected Inward Date *"
                type="date"
                required
                value={expectedInwardDate}
                onChange={(e) => setExpectedInwardDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Payment Terms, Advance Calculation & TAT (PART 1.6 & PART 3) */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <FaFileInvoice className="text-primary text-base" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Payment Terms, Advance & Delivery TAT
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <CustomInput
                label="Advance Percentage (%)"
                type="number"
                min="0"
                max="100"
                value={advancePercentage}
                onChange={(e) => setAdvancePercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              />
            </div>
            <div>
              <CustomInput
                label="Production TAT (Days) 🔒"
                type="number"
                value={productionTatDays}
                readOnly
                disabled
                className="opacity-80 bg-surface-hover cursor-not-allowed font-black"
              />
              <span className="text-[9px] text-text-muted block mt-0.5">
                Configured in Admin Settings
              </span>
            </div>
            <div>
              <CustomInput
                label="Supply / Transit TAT (Days) 🔒"
                type="number"
                value={supplyTatDays}
                readOnly
                disabled
                className="opacity-80 bg-surface-hover cursor-not-allowed font-black"
              />
              <span className="text-[9px] text-text-muted block mt-0.5">
                Configured in Admin Settings
              </span>
            </div>
            <div>
              <CustomInput
                label="Estimated Transport Cost (₹)"
                type="number"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Financial Calculation Summary Card */}
          <div className="bg-bg/80 border border-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-[10px] font-bold text-text-muted uppercase block">Subtotal</span>
              <span className="text-sm font-black text-text-primary">₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-text-muted uppercase block">GST ({gstRate}%)</span>
              <span className="text-sm font-black text-text-primary">₹{taxAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="bg-primary/5 rounded-lg py-1 border border-primary/20">
              <span className="text-[10px] font-bold text-primary uppercase block">Advance ({advancePercentage}%)</span>
              <span className="text-sm font-black text-primary">₹{advanceAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="bg-emerald-500/5 rounded-lg py-1 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Total PI Value</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{totalPiValue.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Generating Indent..." : "Generate Purchase Indent"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
