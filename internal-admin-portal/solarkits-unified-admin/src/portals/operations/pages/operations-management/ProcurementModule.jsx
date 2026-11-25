import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaShoppingCart, FaCheckCircle, FaExclamationTriangle, FaSearch,
  FaClipboardList, FaArrowRight, FaMapMarkerAlt, FaHistory,
  FaLock, FaUnlock, FaInfoCircle, FaSpinner, FaTimesCircle
} from 'react-icons/fa';
import { HiOutlineBell } from 'react-icons/hi';
import { getSkuBenchmarkInfo, createPriceRequest } from "../../api/operations";

// Custom UI Components
import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";
import ConfirmationPopup from "../../components/ConfirmationPopup";
import CustomTable from "../../components/CustomTable";

// ── Static / Seed Data (UI demo layer) ────────────────────────────────────────
const initialLiveProjectPOs = [
  { id: "PO-REQ-801", project: "Solar Shop Rooftop Jaipur", item: "Solar Panel Waaree 550W", qty: 200, sku_id: null, warehouse_id: null, status: "Awaiting Procurement" },
  { id: "PO-REQ-802", project: "Adani Cluster Site Jodhpur", item: "Inverter Solis 50kW", qty: 10, sku_id: null, warehouse_id: null, status: "Awaiting Procurement" },
  { id: "PO-REQ-803", project: "DIY Residential Sanganer", item: "ACDC Cables 4 sq mm", qty: 40, sku_id: null, warehouse_id: null, status: "Procured" }
];

const approvedSuppliers = [
  { name: "Rajasthan Solar Distributors", location: "Jaipur, RJ (Local)", distance: "12 km", rawRate: 18500, timeline: "2 Days", rawTimeline: 2, rawAvailability: 600, availability: "600 panels available", rating: "4.8 / 5" },
  { name: "Gujarat Warehousing Corp", location: "Ahmedabad, GJ (Inter-State)", distance: "230 km", rawRate: 17900, timeline: "5 Days", rawTimeline: 5, rawAvailability: 2000, availability: "2000 panels available", rating: "4.5 / 5" },
  { name: "Delta Power Solutions", location: "Delhi NCR (Inter-State)", distance: "260 km", rawRate: 18100, timeline: "3 Days", rawTimeline: 3, rawAvailability: 150, availability: "150 panels available", rating: "4.2 / 5" }
];

const initialProcurementOrders = [
  { poId: "PO-MST-9901", projectReqId: "PO-REQ-803", supplier: "Rajasthan Solar Distributors", items: "ACDC Cables 4 sq mm - 40 Coils", totalVal: "₹1,80,000", status: "Accepted by Supplier", date: "2026-06-14" }
];

// ── Module ─────────────────────────────────────────────────────────────────────
export default function ProcurementModule() {
  const [livePOs, setLivePOs] = useState(initialLiveProjectPOs);
  const [procurementOrders, setProcurementOrders] = useState(initialProcurementOrders);
  const [selectedPO, setSelectedPO] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [compareMetric, setCompareMetric] = useState('rate');

  // Benchmark price state for selected PO
  const [benchmarkInfo, setBenchmarkInfo] = useState(null); // { benchmark_price, currency_code, pending_request }
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  // Price request modal
  const [showPriceRequestModal, setShowPriceRequestModal] = useState(false);
  const [priceRequestForm, setPriceRequestForm] = useState({ requested_price: '', reason: '' });
  const [priceRequestLoading, setPriceRequestLoading] = useState(false);
  const [priceRequestSuccess, setPriceRequestSuccess] = useState(false);

  // Custom alert / confirmation popup state
  const [popupState, setPopupState] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    onConfirm: null
  });

  const showAlert = (message, title = "Notification", variant = "info", onConfirm = null) => {
    setPopupState({
      isOpen: true,
      title,
      message,
      variant,
      onConfirm
    });
  };

  // Sorted suppliers
  const sortedSuppliers = useMemo(() => {
    const list = [...approvedSuppliers];
    if (compareMetric === 'rate') return list.sort((a, b) => a.rawRate - b.rawRate);
    if (compareMetric === 'timeline') return list.sort((a, b) => a.rawTimeline - b.rawTimeline);
    if (compareMetric === 'availability') return list.sort((a, b) => b.rawAvailability - a.rawAvailability);
    return list;
  }, [compareMetric]);

  // When a PO is selected, fetch benchmark info if sku_id + warehouse_id are available
  const fetchBenchmarkInfo = useCallback(async (po) => {
    if (!po?.sku_id || !po?.warehouse_id) {
      // Demo mode — simulate benchmark info with the first supplier rate as "benchmark"
      setBenchmarkInfo({ benchmark_price: 19000, currency_code: 'INR', pending_request: null, demo: true });
      return;
    }
    setBenchmarkLoading(true);
    setBenchmarkInfo(null);
    try {
      const res = await getSkuBenchmarkInfo(po.sku_id, po.warehouse_id, "00000000");
      if (res && res.status === "success") {
        setBenchmarkInfo({
          benchmark_price: res.benchmark_price,
          currency_code: res.currency_code,
          pending_request: res.pending_request,
          demo: false
        });
      }
    } catch (err) {
      console.error("Failed to fetch benchmark info:", err);
    } finally {
      setBenchmarkLoading(false);
    }
  }, []);

  const handleSelectPO = (po) => {
    setSelectedPO(po);
    setPriceRequestSuccess(false);
    setShowPriceRequestModal(false);
    setBenchmarkInfo(null);
    setActiveTab('compare');
    fetchBenchmarkInfo(po);
  };

  // Check if a given supplier rate exceeds benchmark
  const isRateBlocked = (supplierRate) => {
    if (!benchmarkInfo || benchmarkInfo.benchmark_price <= 0) return true; // block if no benchmark
    return supplierRate > benchmarkInfo.benchmark_price;
  };

  const handleCreateProcurementPO = (supplier) => {
    if (isRateBlocked(supplier.rawRate)) return; // safety guard
    const poId = `PO-MST-99${procurementOrders.length + 2}`;
    const qty = selectedPO.qty;
    const totalVal = `₹${(supplier.rawRate * qty).toLocaleString()}`;

    const newOrder = {
      poId,
      projectReqId: selectedPO.id,
      supplier: supplier.name,
      items: `${selectedPO.item} - ${selectedPO.qty} Pcs`,
      totalVal,
      status: "Sent to Supplier",
      date: new Date().toISOString().split('T')[0]
    };

    setProcurementOrders([newOrder, ...procurementOrders]);
    setLivePOs(livePOs.map(p => p.id === selectedPO.id ? { ...p, status: "Procured" } : p));
    setSelectedPO(null);
    setActiveTab('orders');
    showAlert(`Procurement PO ${poId} successfully sent to ${supplier.name}.`, "PO Released", "success");
  };

  const simulateSupplierAcceptance = (po) => {
    setProcurementOrders(procurementOrders.map(o =>
      o.poId === po.poId ? { ...o, status: "Accepted by Supplier" } : o
    ));
    showAlert(`Supplier has accepted the PO ${po.poId}!`, "Supplier Acceptance", "success");
  };

  const handleSubmitPriceRequest = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;
    setPriceRequestLoading(true);
    try {
      // Demo mode: just simulate success if sku_id not set
      if (!selectedPO.sku_id || !selectedPO.warehouse_id) {
        await new Promise(r => setTimeout(r, 900));
        setPriceRequestSuccess(true);
        setBenchmarkInfo(prev => ({ ...prev, pending_request: { requested_price: Number(priceRequestForm.requested_price), status: 'pending', created_at: new Date() } }));
        setShowPriceRequestModal(false);
        setPriceRequestForm({ requested_price: '', reason: '' });
        return;
      }
      const payload = {
        sku_id: selectedPO.sku_id,
        warehouse_id: selectedPO.warehouse_id,
        requested_price: Number(priceRequestForm.requested_price),
        reason: priceRequestForm.reason,
      };
      const res = await createPriceRequest(payload, "00000000");
      if (res && res.status === "success") {
        setPriceRequestSuccess(true);
        setBenchmarkInfo(prev => ({ ...prev, pending_request: { requested_price: Number(priceRequestForm.requested_price), status: 'pending', created_at: new Date() } }));
        setShowPriceRequestModal(false);
        setPriceRequestForm({ requested_price: '', reason: '' });
      } else {
        showAlert("Failed to submit price request: " + (res?.message || "Unknown error."), "Submission Failed", "danger");
      }
    } catch (err) {
      showAlert("Network error submitting price request.", "Network Error", "danger");
      console.error(err);
    } finally {
      setPriceRequestLoading(false);
    }
  };

  const fmtCurrency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <FaShoppingCart className="text-primary" />
            Supplier Procurement Module
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Fulfill live project PO demands by comparing approved suppliers and generating compliant purchase orders.
          </p>
        </div>

        <div className="flex bg-card p-1 rounded-xl border border-border shadow-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'gradient-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Procurement Dashboard
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'orders' ? 'gradient-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Procured PO Status ({procurementOrders.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 card p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-3 flex items-center gap-2">
                <FaClipboardList className="text-primary" />
                Live Project PO Requests
              </h3>

              <div className="divide-y divide-border/60">
                {livePOs.map(po => (
                  <div key={po.id} className="py-3 flex justify-between items-center text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{po.id}</span>
                        <span className="text-text-primary font-semibold">{po.project}</span>
                      </div>
                      <div className="text-text-secondary font-medium">
                        {po.item} • <strong>Qty: {po.qty} Pcs</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        po.status === 'Procured'
                          ? 'bg-success/15 text-success border-success/10'
                          : 'bg-warning/15 text-warning border-warning/10 animate-pulse'
                      }`}>
                        {po.status}
                      </span>
                      {po.status !== 'Procured' && (
                        <Button
                          onClick={() => handleSelectPO(po)}
                          variant="primary"
                          size="sm"
                          rightIcon={<FaArrowRight size={8} />}
                        >
                          Procure Supplier
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border pb-2">
                Approved Supplier Catalog
              </h3>
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Total Approved Suppliers:</span>
                  <span className="font-bold text-text-primary">12 Suppliers</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Contracts:</span>
                  <span className="font-bold text-text-primary">8 suppliers</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending PO Requests:</span>
                  <span className="font-bold text-warning">{livePOs.filter(p => p.status !== 'Procured').length}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── COMPARE SUPPLIERS ── */}
        {activeTab === 'compare' && selectedPO && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Benchmark Price Info Banner */}
            <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
              benchmarkLoading
                ? 'bg-bg border-border'
                : benchmarkInfo?.benchmark_price > 0
                  ? 'bg-success/5 border-success/20'
                  : 'bg-danger/5 border-danger/20'
            }`}>
              {benchmarkLoading ? (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <FaSpinner className="animate-spin text-primary" />
                  Checking benchmark price for this SKU...
                </div>
              ) : benchmarkInfo ? (
                <>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {benchmarkInfo.benchmark_price > 0
                        ? <FaUnlock className="text-success" />
                        : <FaLock className="text-danger" />}
                      <span className="text-xs font-bold text-text-primary">
                        {benchmarkInfo.benchmark_price > 0
                          ? `Benchmark Price: ₹${Number(benchmarkInfo.benchmark_price).toLocaleString('en-IN')} / unit`
                          : 'No Benchmark Price Configured'}
                      </span>
                      {benchmarkInfo.demo && (
                        <span className="text-[9px] bg-warning/15 text-warning border border-warning/20 px-1.5 py-0.5 rounded font-bold">Demo</span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary">
                      {benchmarkInfo.benchmark_price > 0
                        ? 'PO release is permitted for suppliers priced at or below this benchmark.'
                        : 'A benchmark price must be approved before releasing a PO. Submit a price request to the Admin.'}
                    </p>
                    {benchmarkInfo.pending_request && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-primary font-bold">
                        <HiOutlineBell className="text-sm" />
                        Price request ₹{Number(benchmarkInfo.pending_request.requested_price).toLocaleString('en-IN')} is pending Admin approval.
                      </div>
                    )}
                  </div>

                  {(benchmarkInfo.benchmark_price <= 0 || priceRequestSuccess) && !benchmarkInfo.pending_request && (
                    <Button
                      onClick={() => setShowPriceRequestModal(true)}
                      variant="outline"
                      size="sm"
                      leftIcon={<HiOutlineBell />}
                    >
                      Request Benchmark Price Update
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <FaInfoCircle />
                  Benchmark price info unavailable.
                </div>
              )}
            </div>

            {priceRequestSuccess && (
              <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-xl px-4 py-2.5 font-semibold">
                <FaCheckCircle />
                Price update request submitted to Admin. PO release will be unlocked after Admin approval.
              </div>
            )}

            <div className="card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Compare Suppliers: {selectedPO.item} (Qty: {selectedPO.qty})
                  </h3>
                  <p className="text-[10px] text-text-secondary">Comparing against approved suppliers list</p>
                </div>

                <div className="flex gap-2">
                  {[
                    { key: 'rate', label: 'Lowest Price' },
                    { key: 'timeline', label: 'Fastest Delivery' },
                    { key: 'availability', label: 'Highest Availability' }
                  ].map(metric => (
                    <Button
                      key={metric.key}
                      onClick={() => setCompareMetric(metric.key)}
                      variant={compareMetric === metric.key ? "primary" : "outline"}
                      size="sm"
                    >
                      {metric.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedSuppliers.map((sup, idx) => {
                  const blocked = isRateBlocked(sup.rawRate);
                  return (
                    <div key={idx} className={`p-4 border rounded-xl flex flex-col justify-between space-y-4 relative ${
                      blocked ? 'bg-danger/3 border-danger/20' : 'bg-bg border-border'
                    }`}>
                      {blocked && (
                        <div className="absolute top-2 right-2">
                          <span className="flex items-center gap-1 text-[8px] font-bold bg-danger/15 text-danger border border-danger/20 px-1.5 py-0.5 rounded-full">
                            <FaLock size={7} /> Rate Exceeds Benchmark
                          </span>
                        </div>
                      )}
                      {!blocked && idx === 0 && (
                        <div className="absolute top-2 right-2">
                          <span className="flex items-center gap-1 text-[8px] font-bold bg-success/15 text-success border border-success/20 px-1.5 py-0.5 rounded-full">
                            <FaCheckCircle size={7} /> Best Option
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-text-primary text-xs max-w-[160px] pr-2">{sup.name}</h4>
                          <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            ★ {sup.rating}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-1">
                          <FaMapMarkerAlt /> {sup.location} ({sup.distance})
                        </p>

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex justify-between border-b border-border/50 pb-1">
                            <span>Purchase Rate:</span>
                            <strong className={blocked ? 'text-danger' : 'text-text-primary'}>
                              {fmtCurrency(sup.rawRate)}
                            </strong>
                          </div>
                          {benchmarkInfo?.benchmark_price > 0 && (
                            <div className="flex justify-between border-b border-border/50 pb-1">
                              <span>vs Benchmark:</span>
                              <strong className={blocked ? 'text-danger' : 'text-success'}>
                                {blocked
                                  ? `+${fmtCurrency(sup.rawRate - benchmarkInfo.benchmark_price)} over`
                                  : `${fmtCurrency(benchmarkInfo.benchmark_price - sup.rawRate)} under`}
                              </strong>
                            </div>
                          )}
                          <div className="flex justify-between border-b border-border/50 pb-1">
                            <span>Delivery Timeline:</span>
                            <strong className="text-text-primary">{sup.timeline}</strong>
                          </div>
                          <div className="flex justify-between border-b border-border/50 pb-1">
                            <span>Product Stock:</span>
                            <strong className="text-text-primary">{sup.availability}</strong>
                          </div>
                        </div>
                      </div>

                      {blocked ? (
                        <div className="space-y-2">
                          <div className="w-full py-2 rounded-lg bg-danger/10 text-danger text-[10px] font-bold text-center flex items-center justify-center gap-1">
                            <FaLock size={9} /> PO Release Blocked
                          </div>
                          <Button
                            onClick={() => setShowPriceRequestModal(true)}
                            variant="outline"
                            fullWidth
                            size="sm"
                            leftIcon={<HiOutlineBell />}
                          >
                            Request Price Update
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleCreateProcurementPO(sup)}
                          variant="primary"
                          fullWidth
                          size="sm"
                          leftIcon={<FaCheckCircle size={9} />}
                        >
                          Select & Release PO
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => { setSelectedPO(null); setActiveTab('dashboard'); }}
              variant="ghost"
              size="sm"
            >
              ← Back to Dashboard
            </Button>
          </motion.div>
        )}

        {/* ── PROCURED PO TRACKING ── */}
        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="card overflow-hidden"
          >
            <CustomTable
              headers={[
                { key: "poId", label: "PO ID" },
                { key: "supplier", label: "Supplier" },
                { key: "items", label: "Consignment Items" },
                { key: "totalVal", label: "Grand Total Value" },
                { key: "status", label: "Fulfillment Status" },
                { key: "date", label: "Order Date" },
                { key: "actions", label: "Supplier Acceptance", align: "center" }
              ]}
              data={procurementOrders}
              renderRow={(o) => (
                <>
                  <td className="p-4 font-bold text-primary">{o.poId}</td>
                  <td className="p-4 font-semibold text-text-primary">{o.supplier}</td>
                  <td className="p-4 font-medium text-text-secondary">{o.items}</td>
                  <td className="p-4 font-black text-text-primary">{o.totalVal}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      o.status === 'Accepted by Supplier'
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-primary/10 text-primary border-primary/20 animate-pulse'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-text-secondary">{o.date}</td>
                  <td className="p-4 text-center">
                    {o.status === 'Sent to Supplier' ? (
                      <Button
                        onClick={() => simulateSupplierAcceptance(o)}
                        variant="success"
                        size="sm"
                      >
                        Simulate Accept
                      </Button>
                    ) : (
                      <span className="text-success font-bold">✓ Accepted</span>
                    )}
                  </td>
                </>
              )}
              emptyMessage="No procurement orders placed yet."
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BENCHMARK PRICE REQUEST MODAL ── */}
      <AnimatePresence>
        {showPriceRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]"
          >
            <motion.form
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onSubmit={handleSubmitPriceRequest}
              className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <div>
                  <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                    <HiOutlineBell className="text-primary" />
                    Request Benchmark Price Update
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Submit to Admin for approval. PO release unlocks once approved.
                  </p>
                </div>
                <button type="button" onClick={() => setShowPriceRequestModal(false)} className="text-text-muted hover:text-text-primary font-bold text-xs">✕</button>
              </div>

              <div className="bg-bg border border-border/50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">SKU / Item:</span>
                  <span className="font-bold text-text-primary">{selectedPO?.item}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Current Benchmark:</span>
                  <span className={`font-bold ${benchmarkInfo?.benchmark_price > 0 ? 'text-text-primary' : 'text-danger'}`}>
                    {benchmarkInfo?.benchmark_price > 0 ? fmtCurrency(benchmarkInfo.benchmark_price) : 'Not Set'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <CustomInput
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 19500"
                  label="Requested New Benchmark Price (₹)"
                  value={priceRequestForm.requested_price}
                  onChange={e => setPriceRequestForm(prev => ({ ...prev, requested_price: e.target.value }))}
                />

                <CustomInput
                  type="textarea"
                  required
                  rows={3}
                  placeholder="Explain why the benchmark price needs to be updated (e.g., market rate increase, supplier cost hike)..."
                  label="Business Justification"
                  value={priceRequestForm.reason}
                  onChange={e => setPriceRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowPriceRequestModal(false)}
                  variant="outline"
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={priceRequestLoading}
                  loading={priceRequestLoading}
                  variant="primary"
                  fullWidth
                  leftIcon={<HiOutlineBell />}
                >
                  Submit Request
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation popup for alerts */}
      <ConfirmationPopup
        isOpen={popupState.isOpen}
        title={popupState.title}
        message={popupState.message}
        variant={popupState.variant}
        confirmText="OK"
        showIcon={true}
        onConfirm={() => {
          setPopupState(prev => ({ ...prev, isOpen: false }));
          if (popupState.onConfirm) popupState.onConfirm();
        }}
        onCancel={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
