import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaBoxes,
  FaClipboardCheck,
  FaExchangeAlt,
  FaBalanceScale,
  FaSearch,
  FaPlus,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaEye,
  FaFileInvoice,
  FaWarehouse,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

// Tab 1: Stock Master Mock Data
const MOCK_SKU_STOCK = [
  {
    sku_code: "BOS-CAB-4MM-RED",
    name: "4 sq.mm DC Solar Cable - Red (100m Roll)",
    category: "Cables & Wiring",
    physical_qty: 450,
    reserved_qty: 120,
    available_qty: 330,
    batch_no: "BT-2026-POL-04",
    low_stock_threshold: 100,
    unit: "Rolls",
    warehouse: "Bhiwandi Central Hub",
  },
  {
    sku_code: "BOS-MC4-CONN-PR",
    name: "MC4 Connectors Male/Female (Pair)",
    category: "Connectors & Junctions",
    physical_qty: 1200,
    reserved_qty: 600,
    available_qty: 600,
    batch_no: "BT-2026-STA-12",
    low_stock_threshold: 300,
    unit: "Pairs",
    warehouse: "Bhiwandi Central Hub",
  },
  {
    sku_code: "BOS-EARTH-ROD-COP",
    name: "Pure Copper Bonded Chemical Earthing Electrode (2m)",
    category: "Earthing & Protection",
    physical_qty: 45,
    reserved_qty: 40,
    available_qty: 5, // LOW STOCK!
    batch_no: "BT-2026-ERT-01",
    low_stock_threshold: 20,
    unit: "Nos",
    warehouse: "Gurgaon NCR Hub",
  },
  {
    sku_code: "BOS-SPD-1000V-DC",
    name: "DC Surge Protective Device (SPD 1000V 2P)",
    category: "Protection Devices",
    physical_qty: 210,
    reserved_qty: 70,
    available_qty: 140,
    batch_no: "BT-2026-SCH-08",
    low_stock_threshold: 50,
    unit: "Nos",
    warehouse: "Ahmedabad Sub-Depot",
  },
  {
    sku_code: "BOS-STRUC-ALU-MID",
    name: "Aluminium Mid Clamps 35mm with Allen Bolts",
    category: "Structure & Mounting",
    physical_qty: 3500,
    reserved_qty: 1800,
    available_qty: 1700,
    batch_no: "BT-2026-ALU-99",
    low_stock_threshold: 500,
    unit: "Pcs",
    warehouse: "Bhiwandi Central Hub",
  },
];

// Tab 2: Inward Verification Mock Data
const MOCK_INWARD_ENTRIES = [
  {
    id: "inw-101",
    inward_number: "INW-WH01-2026-088",
    po_number: "PO-2026-1102",
    supplier: "Polycab Wires & Cables",
    item_name: "4 sq.mm DC Solar Cable - Red (100m Roll)",
    ordered_qty: 200,
    received_qty: 195,
    accepted_qty: 195,
    rejected_qty: 0,
    shortage_qty: 5,
    discrepancy_notes: "5 rolls short received at Bhiwandi dock; vendor invoice endorsed for 195 rolls.",
    status: "Pending Accounts Verification",
    received_date: "2026-09-27",
    warehouse: "Bhiwandi Central Hub",
  },
  {
    id: "inw-102",
    inward_number: "INW-WH03-2026-042",
    po_number: "PO-2026-1095",
    supplier: "Schneider Electric India",
    item_name: "DC Surge Protective Device (SPD 1000V 2P)",
    ordered_qty: 100,
    received_qty: 100,
    accepted_qty: 92,
    rejected_qty: 8,
    shortage_qty: 0,
    discrepancy_notes: "8 units found with cracked outer terminal casing during inward QC inspection.",
    status: "Pending Accounts Verification",
    received_date: "2026-09-26",
    warehouse: "Gurgaon NCR Hub",
  },
  {
    id: "inw-103",
    inward_number: "INW-WH01-2026-081",
    po_number: "PO-2026-1044",
    supplier: "Staubli Electrical Connectors",
    item_name: "MC4 Connectors Male/Female (Pair)",
    ordered_qty: 1000,
    received_qty: 1000,
    accepted_qty: 1000,
    rejected_qty: 0,
    shortage_qty: 0,
    discrepancy_notes: "All 1000 pairs sound and verified against invoice count.",
    status: "Accounts Verified",
    received_date: "2026-09-22",
    warehouse: "Bhiwandi Central Hub",
  },
];

// Tab 3: Stock Movement Ledger Mock Data
const MOCK_LEDGER = [
  {
    id: "mov-1",
    timestamp: "2026-09-28 10:15",
    sku_code: "BOS-CAB-4MM-RED",
    item_name: "4 sq.mm DC Solar Cable - Red",
    movement_type: "Reserved",
    qty: -20,
    warehouse: "Bhiwandi Central Hub",
    reference_no: "ORD-2026-9041",
    user: "System (Order Dispatch Allocation)",
  },
  {
    id: "mov-2",
    timestamp: "2026-09-27 16:30",
    sku_code: "BOS-CAB-4MM-RED",
    item_name: "4 sq.mm DC Solar Cable - Red",
    movement_type: "Inward",
    qty: +195,
    warehouse: "Bhiwandi Central Hub",
    reference_no: "INW-WH01-2026-088",
    user: "Rakesh Verma (Warehouse In-charge)",
  },
  {
    id: "mov-3",
    timestamp: "2026-09-26 14:10",
    sku_code: "BOS-SPD-1000V-DC",
    item_name: "DC Surge Protective Device",
    movement_type: "Outward",
    qty: -15,
    warehouse: "Ahmedabad Sub-Depot",
    reference_no: "ORD-2026-8812",
    user: "Nilesh Patel (Dispatch Lead)",
  },
  {
    id: "mov-4",
    timestamp: "2026-09-25 11:00",
    sku_code: "BOS-EARTH-ROD-COP",
    item_name: "Chemical Earthing Electrode",
    movement_type: "Adjustment",
    qty: -2,
    warehouse: "Gurgaon NCR Hub",
    reference_no: "ADJ-2026-012",
    user: "Deepak S (Authorized Audit)",
  },
];

// Tab 4: Stock Adjustments Mock Data
const MOCK_ADJUSTMENTS = [
  {
    id: "adj-1",
    date: "2026-09-27",
    sku_code: "BOS-EARTH-ROD-COP",
    item_name: "Pure Copper Bonded Chemical Earthing Electrode",
    adjustment_qty: -2,
    reason: "Damaged in Forklift Shifting",
    requested_by: "Vikas Sharma (Gurgaon)",
    authorization_status: "Approved",
    authorized_by: "Accounts Lead (Kiran Shah)",
  },
  {
    id: "adj-2",
    date: "2026-09-28",
    sku_code: "BOS-STRUC-ALU-MID",
    item_name: "Aluminium Mid Clamps 35mm",
    adjustment_qty: +50,
    reason: "Physical Cycle Count Surplus",
    requested_by: "Rakesh Verma (Bhiwandi)",
    authorization_status: "Pending Authorization",
    authorized_by: "—",
  },
];

export default function BoskitInventory() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "inward" | "ledger" | "adjustments"
  const [loading, setLoading] = useState(false);

  // States
  const [stockItems, setStockItems] = useState(MOCK_SKU_STOCK);
  const [inwardEntries, setInwardEntries] = useState(MOCK_INWARD_ENTRIES);
  const [ledgerEntries, setLedgerEntries] = useState(MOCK_LEDGER);
  const [adjustments, setAdjustments] = useState(MOCK_ADJUSTMENTS);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [movementFilter, setMovementFilter] = useState("");

  // Adjustment Modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjFormData, setAdjFormData] = useState({
    sku_code: MOCK_SKU_STOCK[0].sku_code,
    adjustment_qty: 1,
    reason: "Physical Cycle Count Correction",
    notes: "",
  });

  // KPI Calculations for Stock Overview
  const kpis = useMemo(() => {
    const totalSkus = stockItems.length;
    const totalPhysical = stockItems.reduce((acc, curr) => acc + curr.physical_qty, 0);
    const totalReserved = stockItems.reduce((acc, curr) => acc + curr.reserved_qty, 0);
    const totalAvailable = stockItems.reduce((acc, curr) => acc + curr.available_qty, 0);
    const lowStockAlerts = stockItems.filter(
      (item) => item.available_qty <= item.low_stock_threshold
    ).length;

    return { totalSkus, totalPhysical, totalReserved, totalAvailable, lowStockAlerts };
  }, [stockItems]);

  // Inward verification handlers
  const handleVerifyInward = (inwardId, status) => {
    setInwardEntries((prev) =>
      prev.map((inw) => (inw.id === inwardId ? { ...inw, status } : inw))
    );
    dispatch(
      setAlert({
        type: status === "Accounts Verified" ? "success" : "info",
        message: `Inward ${inwardId} ${status === "Accounts Verified" ? "approved & verified" : "rejected"} by accounts.`,
      })
    );
  };

  // Adjustment creation
  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    const targetItem = stockItems.find((s) => s.sku_code === adjFormData.sku_code);
    const newAdj = {
      id: `adj-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      sku_code: adjFormData.sku_code,
      item_name: targetItem?.name || "BOS Item",
      adjustment_qty: Number(adjFormData.adjustment_qty),
      reason: adjFormData.reason,
      requested_by: "Accounts Officer",
      authorization_status: "Pending Authorization",
      authorized_by: "—",
    };

    setAdjustments((prev) => [newAdj, ...prev]);
    dispatch(setAlert({ type: "success", message: "Stock adjustment submitted for approval!" }));
    setAdjModalOpen(false);
  };

  const handleAuthorizeAdjustment = (adjId) => {
    setAdjustments((prev) =>
      prev.map((adj) =>
        adj.id === adjId
          ? {
              ...adj,
              authorization_status: "Approved",
              authorized_by: "Senior Accounts Lead",
            }
          : adj
      )
    );
    dispatch(setAlert({ type: "success", message: "Stock adjustment authorized & stock updated!" }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FaBoxes className="text-primary" /> BOSKIT Inventory & Reconciliation
          </h2>
          <p className="text-text-secondary text-sm">
            Accounts reconciliation for Balance of System (BOS) components, inward verification, stock movement ledgers, and adjustments.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-bg p-1 rounded-lg border border-border overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaBoxes /> Stock Overview
          </button>
          <button
            onClick={() => setActiveTab("inward")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "inward"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaClipboardCheck /> Inward Verification ({inwardEntries.filter(i => i.status.includes("Pending")).length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "ledger"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaExchangeAlt /> Stock Ledger
          </button>
          <button
            onClick={() => setActiveTab("adjustments")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "adjustments"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaBalanceScale /> Adjustments ({adjustments.filter(a => a.authorization_status.includes("Pending")).length})
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: STOCK OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
              <span className="text-xs text-text-secondary font-medium">Total SKUs</span>
              <div className="text-2xl font-bold text-text-primary mt-1">{kpis.totalSkus}</div>
              <span className="text-[11px] text-text-secondary">Catalog components</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
              <span className="text-xs text-blue-600 font-medium">Physical Qty</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{kpis.totalPhysical.toLocaleString("en-IN")}</div>
              <span className="text-[11px] text-text-secondary">Warehouse stock count</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
              <span className="text-xs text-amber-600 font-medium">Reserved Qty</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.totalReserved.toLocaleString("en-IN")}</div>
              <span className="text-[11px] text-text-secondary">Locked for orders</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
              <span className="text-xs text-emerald-600 font-medium">Available to Promise</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.totalAvailable.toLocaleString("en-IN")}</div>
              <span className="text-[11px] text-text-secondary">Free balance</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
              <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                <FaExclamationTriangle /> Low Stock Alerts
              </span>
              <div className="text-2xl font-black text-red-600 mt-1">{kpis.lowStockAlerts}</div>
              <span className="text-[11px] text-red-500 font-medium">Below safety threshold</span>
            </div>
          </div>

          {/* SKU Master Table */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-72">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
                <input
                  type="text"
                  placeholder="Search SKU or Item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <span className="text-xs text-text-secondary">
                Red highlighted rows indicate available stock below low threshold.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                    <th className="p-4">SKU Code & Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Physical Qty</th>
                    <th className="p-4">Reserved</th>
                    <th className="p-4">Available Qty</th>
                    <th className="p-4">Batch # & Warehouse</th>
                    <th className="p-4">Threshold</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {stockItems
                    .filter(
                      (item) =>
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.sku_code.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => {
                      const isLowStock = item.available_qty <= item.low_stock_threshold;

                      return (
                        <tr
                          key={item.sku_code}
                          className={`hover:bg-bg/50 transition-colors ${
                            isLowStock ? "bg-red-500/5 hover:bg-red-500/10" : ""
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-bold text-text-primary">{item.name}</div>
                            <span className="text-xs font-mono text-text-secondary">{item.sku_code}</span>
                          </td>

                          <td className="p-4 text-xs text-text-secondary font-medium">
                            {item.category}
                          </td>

                          <td className="p-4 font-mono font-medium text-text-primary">
                            {item.physical_qty} {item.unit}
                          </td>

                          <td className="p-4 font-mono text-amber-600 font-medium">
                            {item.reserved_qty} {item.unit}
                          </td>

                          <td className="p-4 font-mono font-bold text-base">
                            <span className={isLowStock ? "text-red-600" : "text-emerald-600"}>
                              {item.available_qty} {item.unit}
                            </span>
                          </td>

                          <td className="p-4 text-xs">
                            <div className="font-mono text-text-secondary">{item.batch_no}</div>
                            <div className="text-[11px] text-text-secondary">{item.warehouse}</div>
                          </td>

                          <td className="p-4 text-xs font-mono text-text-secondary">
                            Min: {item.low_stock_threshold} {item.unit}
                          </td>

                          <td className="p-4 text-right">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                <FaExclamationTriangle /> Reorder
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: INWARD VERIFICATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "inward" && (
        <div className="space-y-4">
          <div className="text-sm text-text-secondary">
            Verify dock received quantities against purchase order bills. Accounts approval updates physical stock records and allows invoice booking.
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                    <th className="p-4">Inward # & Date</th>
                    <th className="p-4">PO & Supplier</th>
                    <th className="p-4">Item & Counts</th>
                    <th className="p-4">Discrepancy & Damaged</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4 text-right">Accounts Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {inwardEntries.map((inw) => {
                    const isPending = inw.status.includes("Pending");

                    return (
                      <tr key={inw.id} className="hover:bg-bg/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-text-primary">{inw.inward_number}</div>
                          <div className="text-xs text-text-secondary font-mono">{inw.received_date}</div>
                          <div className="text-[11px] text-text-secondary">{inw.warehouse}</div>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-text-primary">{inw.supplier}</div>
                          <span className="text-xs text-primary font-mono">{inw.po_number}</span>
                        </td>

                        <td className="p-4">
                          <div className="font-medium text-text-primary text-xs">{inw.item_name}</div>
                          <div className="text-xs text-text-secondary mt-1 grid grid-cols-2 gap-1 font-mono">
                            <span>Ordered: <strong>{inw.ordered_qty}</strong></span>
                            <span>Received: <strong>{inw.received_qty}</strong></span>
                            <span>Accepted: <strong className="text-emerald-600">{inw.accepted_qty}</strong></span>
                            <span>Rejected: <strong className="text-red-500">{inw.rejected_qty}</strong></span>
                          </div>
                        </td>

                        <td className="p-4 max-w-xs">
                          {inw.shortage_qty > 0 && (
                            <div className="text-xs font-bold text-amber-600 mb-1">
                              Shortage: {inw.shortage_qty} Units
                            </div>
                          )}
                          <p className="text-xs text-text-secondary">{inw.discrepancy_notes}</p>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              inw.status === "Accounts Verified"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : inw.status === "Accounts Rejected"
                                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}
                          >
                            {inw.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleVerifyInward(inw.id, "Accounts Verified")}
                                className="px-3 py-1.5 text-xs rounded bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex items-center gap-1"
                              >
                                <FaCheck /> Approve
                              </button>
                              <button
                                onClick={() => handleVerifyInward(inw.id, "Accounts Rejected")}
                                className="px-3 py-1.5 text-xs rounded bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center gap-1"
                              >
                                <FaTimes /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: STOCK MOVEMENT LEDGER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">All Movement Types</option>
                <option value="Inward">Inward</option>
                <option value="Outward">Outward</option>
                <option value="Reserved">Reserved</option>
                <option value="Adjustment">Adjustment</option>
              </select>
            </div>

            <span className="text-xs text-text-secondary">
              Chronological ledger tracking inward receipts, fulfillment reservations, and audit write-offs.
            </span>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Item & SKU Code</th>
                    <th className="p-4">Movement Type</th>
                    <th className="p-4">Qty Change</th>
                    <th className="p-4">Warehouse Location</th>
                    <th className="p-4">Reference Doc #</th>
                    <th className="p-4 text-right">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledgerEntries
                    .filter((l) => (movementFilter ? l.movement_type === movementFilter : true))
                    .map((log) => {
                      const isPositive = log.qty > 0;

                      return (
                        <tr key={log.id} className="hover:bg-bg/50 transition-colors">
                          <td className="p-4 text-xs font-mono text-text-secondary">{log.timestamp}</td>
                          <td className="p-4">
                            <div className="font-semibold text-text-primary text-xs">{log.item_name}</div>
                            <span className="text-[11px] font-mono text-text-secondary">{log.sku_code}</span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                log.movement_type === "Inward"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : log.movement_type === "Outward"
                                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                  : log.movement_type === "Reserved"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              }`}
                            >
                              {log.movement_type}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-sm">
                            <span className={isPositive ? "text-emerald-600" : "text-text-primary"}>
                              {isPositive ? `+${log.qty}` : log.qty}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-text-secondary">{log.warehouse}</td>
                          <td className="p-4 text-xs font-mono font-medium text-primary">
                            {log.reference_no}
                          </td>
                          <td className="p-4 text-xs text-text-secondary text-right">{log.user}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: STOCK ADJUSTMENTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "adjustments" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-text-secondary">
              Record inventory adjustments for damaged transit stock, cycle count reconciliation, or scrap write-off.
            </div>
            <Button onClick={() => setAdjModalOpen(true)} className="flex items-center gap-2">
              <FaPlus /> New Adjustment Request
            </Button>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                    <th className="p-4">Date</th>
                    <th className="p-4">Item & SKU</th>
                    <th className="p-4">Qty (+/-)</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Requested By</th>
                    <th className="p-4">Status & Authorized By</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adjustments.map((adj) => {
                    const isPending = adj.authorization_status.includes("Pending");

                    return (
                      <tr key={adj.id} className="hover:bg-bg/50 transition-colors">
                        <td className="p-4 text-xs font-mono text-text-secondary">{adj.date}</td>
                        <td className="p-4">
                          <div className="font-semibold text-text-primary text-xs">{adj.item_name}</div>
                          <span className="text-[11px] font-mono text-text-secondary">{adj.sku_code}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-sm">
                          <span className={adj.adjustment_qty > 0 ? "text-emerald-600" : "text-red-500"}>
                            {adj.adjustment_qty > 0 ? `+${adj.adjustment_qty}` : adj.adjustment_qty}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-text-secondary">{adj.reason}</td>
                        <td className="p-4 text-xs text-text-primary">{adj.requested_by}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              adj.authorization_status === "Approved"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}
                          >
                            {adj.authorization_status}
                          </span>
                          <div className="text-[11px] text-text-secondary mt-0.5">
                            {adj.authorized_by}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {isPending && (
                            <button
                              onClick={() => handleAuthorizeAdjustment(adj.id)}
                              className="px-2.5 py-1 text-xs rounded bg-primary text-white hover:bg-primary/90 font-medium transition-colors"
                            >
                              Authorize
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Request Modal */}
      {adjModalOpen && (
        <Dialog
          isOpen={adjModalOpen}
          onClose={() => setAdjModalOpen(false)}
          title="Create Stock Adjustment Request"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Select SKU / Item *
              </label>
              <select
                value={adjFormData.sku_code}
                onChange={(e) => setAdjFormData({ ...adjFormData, sku_code: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                {stockItems.map((s) => (
                  <option key={s.sku_code} value={s.sku_code}>
                    {s.name} ({s.sku_code}) — Available: {s.available_qty} {s.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Adjustment Qty (+ or -) *
                </label>
                <CustomInput
                  type="number"
                  placeholder="e.g. -5 or 10"
                  value={adjFormData.adjustment_qty}
                  onChange={(e) =>
                    setAdjFormData({ ...adjFormData, adjustment_qty: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjFormData.reason}
                  onChange={(e) => setAdjFormData({ ...adjFormData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Physical Cycle Count Correction">Physical Cycle Count Correction</option>
                  <option value="Damaged in Warehouse/Transit">Damaged in Warehouse/Transit</option>
                  <option value="Customer Return Quality Scrap">Customer Return Quality Scrap</option>
                  <option value="Vendor Shortage Reconciliation">Vendor Shortage Reconciliation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Supporting Documentation & Inspection Remarks
              </label>
              <textarea
                placeholder="Audit observation notes, docket references..."
                value={adjFormData.notes}
                onChange={(e) => setAdjFormData({ ...adjFormData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setAdjModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit for Authorization</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
