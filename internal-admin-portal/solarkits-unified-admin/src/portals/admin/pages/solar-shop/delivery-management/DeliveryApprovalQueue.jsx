import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaShieldAlt,
  FaCheck,
  FaTimes,
  FaTruck,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHistory,
  FaLayerGroup,
  FaEye,
  FaSearch,
  FaInfoCircle,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import Dialog from "@/components/Dialog";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

// Sample Mock Batches requiring Admin Cost Approval
const MOCK_APPROVAL_BATCHES = [
  {
    id: "batch-101",
    batch_number: "DISP-BTCH-2026-081",
    orders_count: 3,
    destination_cluster: "North Cluster (NCR)",
    destination_state: "Haryana & Punjab",
    vehicle_type: "Tata 407 (3.5 Ton Closed)",
    vehicle_number: "HR 55 AH 7821",
    service_provider: "Mahalaxmi Logistics Express",
    benchmark_cost: 14500,
    proposed_cost: 18200,
    difference_amount: 3700,
    difference_pct: 25.5,
    max_overdue_days: 14,
    submitted_by: "Vikas Sharma (Dispatch Officer)",
    submitted_at: "2026-09-28 09:30",
    status: "Pending Approval",
    override_reason: "Heavy monsoon road closure on NH-44 requiring 75km detour through state highway; urgent delivery needed for overdue customer.",
    load_weight_kg: 2450,
    vehicle_capacity_kg: 3500,
    orders: [
      { order_no: "ORD-2026-9041", customer: "Aarav Solar Enterprises", kit: "5kW Combo", weight: 850, overdue: 14 },
      { order_no: "ORD-2026-9088", customer: "SunPower Dealers", kit: "3kW Combo", weight: 600, overdue: 10 },
      { order_no: "ORD-2026-9110", customer: "EcoTech Agro Systems", kit: "5kW Hybrid", weight: 1000, overdue: 7 },
    ],
  },
  {
    id: "batch-102",
    batch_number: "DISP-BTCH-2026-082",
    orders_count: 5,
    destination_cluster: "West Cluster (Gujarat)",
    destination_state: "Gujarat",
    vehicle_type: "Eicher Pro 2049 (2.5 Ton)",
    vehicle_number: "GJ 01 XX 4120",
    service_provider: "Western Cargo Carriers",
    benchmark_cost: 9800,
    proposed_cost: 11000,
    difference_amount: 1200,
    difference_pct: 12.2,
    max_overdue_days: 8,
    submitted_by: "Nilesh Patel (Ahmedabad Depot)",
    submitted_at: "2026-09-28 10:45",
    status: "Pending Approval",
    override_reason: "Sunday premium delivery rate requested by client for immediate industrial site installation.",
    load_weight_kg: 2100,
    vehicle_capacity_kg: 2500,
    orders: [
      { order_no: "ORD-2026-8812", customer: "Mahavir Green Energy", kit: "25kW Bulk", weight: 1200, overdue: 8 },
      { order_no: "ORD-2026-8819", customer: "Kutch Solar Corp", kit: "3kW Combo", weight: 900, overdue: 5 },
    ],
  },
  {
    id: "batch-103",
    batch_number: "DISP-BTCH-2026-079",
    orders_count: 2,
    destination_cluster: "South Cluster (Karnataka)",
    destination_state: "Karnataka",
    vehicle_type: "Mahindra Bolero Maxi Truck (1.5 Ton)",
    vehicle_number: "KA 04 MM 9988",
    service_provider: "FastTrack Freight Hub",
    benchmark_cost: 6500,
    proposed_cost: 6400,
    difference_amount: -100,
    difference_pct: -1.5,
    max_overdue_days: 2,
    submitted_by: "Girish K (Bengaluru Hub)",
    submitted_at: "2026-09-27 16:00",
    status: "Approved",
    override_reason: "Standard rates within benchmark limits.",
    load_weight_kg: 1100,
    vehicle_capacity_kg: 1500,
    orders: [
      { order_no: "ORD-2026-9150", customer: "Surya Shakti EPC", kit: "10kW Customize", weight: 1100, overdue: 2 },
    ],
  },
];

const MOCK_AUDIT_LOGS = [
  {
    id: "aud-1",
    date: "2026-09-25 14:20",
    route_name: "Bhiwandi → Pune Hub",
    changed_by: "Sanjay Singhania (Ops Lead)",
    field: "Base Benchmark Rate / km",
    old_val: "₹ 38.00 / km",
    new_val: "₹ 42.00 / km",
    reason: "Diesel price hike revision per Q3 vendor contracts",
  },
  {
    id: "aud-2",
    date: "2026-09-18 11:05",
    route_name: "Gurgaon → Ludhiana Depot",
    changed_by: "Vikram Mehta (Admin)",
    field: "Max Vehicle Tolerance Limit",
    old_val: "10 %",
    new_val: "15 %",
    reason: "Seasonal monsoon toll surge allowance",
  },
  {
    id: "aud-3",
    date: "2026-09-10 16:50",
    route_name: "Ahmedabad → Rajkot Cluster",
    changed_by: "Nilesh Patel",
    field: "Unloading Charge per Kit",
    old_val: "₹ 350",
    new_val: "₹ 450",
    reason: "Heavy palletized inverter offloading charges",
  },
];

export default function DeliveryApprovalQueue() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "audit"
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState(MOCK_APPROVAL_BATCHES);
  const [auditLogs, setAuditLogs] = useState(MOCK_AUDIT_LOGS);

  // Modals
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [rejectModalBatch, setRejectModalBatch] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchLiveQueue = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/delivery-management/approval-queue`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data.data?.records?.length > 0) {
        const liveRecords = res.data.data.records.map((d) => ({
          id: d._id,
          batch_number: d.delivery_number,
          orders_count: d.stops?.length || 1,
          destination_cluster: d.stops?.[0]?.destination?.district || "Destination Cluster",
          destination_state: d.stops?.[0]?.destination?.state || "State",
          vehicle_type: d.vehicles_allocated?.[0]?.vehicle_type_name || "Assigned Fleet",
          vehicle_number: d.vehicles_allocated?.[0]?.registration_number || "Pending Reg",
          service_provider: d.service_provider_id?.name || "Transporter Fleet",
          benchmark_cost: d.company_benchmark_cost || 4500,
          proposed_cost: d.actual_vendor_cost || 4500,
          difference_amount: Math.max(0, (d.actual_vendor_cost || 0) - (d.company_benchmark_cost || 0)),
          difference_pct: d.company_benchmark_cost > 0
            ? Number((((Math.max(0, (d.actual_vendor_cost || 0) - (d.company_benchmark_cost || 0))) / d.company_benchmark_cost) * 100).toFixed(1))
            : 0,
          max_overdue_days: Math.round((d.hours_waiting || 0) / 24),
          submitted_by: d.delivery_approval?.requested_by?.first_name ? `${d.delivery_approval.requested_by.first_name} ${d.delivery_approval.requested_by.last_name || ''}` : "Dispatch Manager",
          submitted_at: new Date(d.createdAt).toLocaleString("en-IN"),
          status: d.delivery_approval?.status === "approved" || d.status === "cost_approved"
            ? "Approved"
            : d.delivery_approval?.status === "rejected" || d.status === "cost_rejected"
            ? "Rejected"
            : "Pending Approval",
          override_reason: d.override_details?.reason || d.delivery_approval?.approval_remarks || "Freight rate exceeds standard baseline benchmark.",
          load_weight_kg: d.cargo_summary?.total_shipment_weight_kg || 1500,
          vehicle_capacity_kg: 2500,
          orders: (d.stops || []).map((st) => ({
            order_no: st.order_number,
            customer: st.recipient_name,
            kit: `${st.cargo?.total_kits || 1} Kit(s)`,
            weight: st.cargo?.total_weight_kg || 100,
            overdue: 0,
          })),
        }));
        setBatches(liveRecords);
      }
    } catch (err) {
      console.warn("Notice loading live delivery queue, falling back to mock:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLiveQueue();
    }
  }, [token]);

  // Sort batches: highest overdue days first
  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => b.max_overdue_days - a.max_overdue_days);
  }, [batches]);

  // KPIs
  const kpis = useMemo(() => {
    const pending = batches.filter((b) => b.status === "Pending Approval").length;
    const approved = batches.filter((b) => b.status === "Approved").length;
    const rejected = batches.filter((b) => b.status === "Rejected").length;
    const totalOverdueOrders = batches
      .filter((b) => b.status === "Pending Approval")
      .reduce((acc, curr) => acc + curr.orders_count, 0);

    return { pending, approved, rejected, totalOverdueOrders };
  }, [batches]);

  const handleApprove = async (batch) => {
    try {
      if (batch.id && !batch.id.startsWith("batch-")) {
        await axios.post(
          `${API_URL}/delivery-management/approval-queue/${batch.id}/decision`,
          { decision: "approve", remarks: "Approved by Admin" },
          { headers: authHeaderObj() }
        );
      }
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, status: "Approved" } : b))
      );
      dispatch(
        setAlert({
          type: "success",
          message: `Batch ${batch.batch_number} approved! Dispatch release triggered.`,
        })
      );
      if (selectedBatch?.id === batch.id) {
        setSelectedBatch((prev) => ({ ...prev, status: "Approved" }));
      }
    } catch (err) {
      console.error("Error approving batch:", err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Approval failed." }));
    }
  };

  const handleOpenReject = (batch) => {
    setRejectModalBatch(batch);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      dispatch(setAlert({ type: "warning", message: "Rejection reason is required." }));
      return;
    }

    try {
      if (rejectModalBatch.id && !rejectModalBatch.id.startsWith("batch-")) {
        await axios.post(
          `${API_URL}/delivery-management/approval-queue/${rejectModalBatch.id}/decision`,
          { decision: "reject", remarks: rejectionReason },
          { headers: authHeaderObj() }
        );
      }
      setBatches((prev) =>
        prev.map((b) => (b.id === rejectModalBatch.id ? { ...b, status: "Rejected" } : b))
      );
      dispatch(
        setAlert({
          type: "info",
          message: `Batch ${rejectModalBatch.batch_number} rejected and returned to dispatcher.`,
        })
      );
      if (selectedBatch?.id === rejectModalBatch.id) {
        setSelectedBatch((prev) => ({ ...prev, status: "Rejected" }));
      }
      setRejectModalBatch(null);
    } catch (err) {
      console.error("Error rejecting batch:", err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Rejection failed." }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FaShieldAlt className="text-primary" /> Delivery Cost & Over-Benchmark Approval Queue
          </h2>
          <p className="text-text-secondary text-sm">
            Review and authorize vehicle dispatch batches exceeding standard benchmark rates or requiring route exception approval.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-bg p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaTruck /> Approval Queue ({kpis.pending})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === "audit"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaHistory /> Benchmark Audit Trail
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
          <div className="text-xs text-amber-600 font-semibold uppercase">Pending Approval</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{kpis.pending}</div>
          <div className="text-xs text-text-secondary mt-1">Batches awaiting sign-off</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
          <div className="text-xs text-emerald-600 font-semibold uppercase">Approved</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{kpis.approved}</div>
          <div className="text-xs text-text-secondary mt-1">Cleared for dispatch</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
          <div className="text-xs text-red-600 font-semibold uppercase">Rejected</div>
          <div className="text-3xl font-black text-red-600 mt-1">{kpis.rejected}</div>
          <div className="text-xs text-text-secondary mt-1">Returned for rate fix</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
          <div className="text-xs text-primary font-semibold uppercase">Orders At Risk</div>
          <div className="text-3xl font-black text-primary mt-1">{kpis.totalOverdueOrders}</div>
          <div className="text-xs text-text-secondary mt-1">Orders in pending batches</div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: APPROVAL QUEUE TABLE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "queue" && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                  <th className="p-4">Batch # & Submitted</th>
                  <th className="p-4">Destination & Vehicle</th>
                  <th className="p-4">Orders & Load</th>
                  <th className="p-4">Benchmark Cost</th>
                  <th className="p-4">Proposed Cost</th>
                  <th className="p-4">Cost Variance</th>
                  <th className="p-4">Overdue Days</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {sortedBatches.map((b) => {
                  const isPending = b.status === "Pending Approval";
                  const isOver = b.difference_amount > 0;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-bg/50 transition-colors ${
                        b.max_overdue_days > 10 && isPending ? "bg-red-500/5" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-text-primary">{b.batch_number}</div>
                        <div className="text-xs text-text-secondary">{b.submitted_by}</div>
                        <div className="text-[11px] text-text-secondary font-mono">{b.submitted_at}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-text-primary text-xs">{b.destination_cluster}</div>
                        <div className="text-xs text-text-secondary">{b.destination_state}</div>
                        <div className="text-[11px] font-mono text-primary mt-0.5">{b.vehicle_type}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-text-primary">{b.orders_count} Orders</div>
                        <div className="text-xs text-text-secondary">
                          {b.load_weight_kg} kg / {b.vehicle_capacity_kg} kg
                        </div>
                      </td>

                      <td className="p-4 font-mono font-medium text-text-secondary">
                        ₹ {b.benchmark_cost.toLocaleString("en-IN")}
                      </td>

                      <td className="p-4 font-mono font-bold text-text-primary">
                        ₹ {b.proposed_cost.toLocaleString("en-IN")}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold font-mono ${
                            isOver
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}
                        >
                          {isOver ? `+ ₹${b.difference_amount} (+${b.difference_pct}%)` : "Within SLA"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            b.max_overdue_days > 10
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : b.max_overdue_days > 5
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-bg text-text-secondary border border-border"
                          }`}
                        >
                          {b.max_overdue_days} Days Overdue
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            b.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : b.status === "Rejected"
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBatch(b)}
                            className="p-1.5 text-xs rounded bg-bg hover:bg-border text-primary transition-colors"
                            title="Inspect Batch Details"
                          >
                            <FaEye />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(b)}
                                className="px-2.5 py-1 text-xs rounded bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex items-center gap-1"
                              >
                                <FaCheck /> Approve
                              </button>
                              <button
                                onClick={() => handleOpenReject(b)}
                                className="px-2.5 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center gap-1"
                              >
                                <FaTimes /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: BENCHMARK AUDIT TRAIL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-bg/50">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <FaHistory className="text-primary" /> Delivery Benchmark Modification Audit Trail
            </h3>
            <p className="text-xs text-text-secondary">
              Immutable ledger of standard rate revisions, distance benchmark changes, and tolerance limits.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Route / Sector</th>
                  <th className="p-4">Changed By</th>
                  <th className="p-4">Rate Parameter</th>
                  <th className="p-4">Old Baseline</th>
                  <th className="p-4">New Revised Baseline</th>
                  <th className="p-4">Reason for Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg/50 transition-colors">
                    <td className="p-4 text-xs font-mono text-text-secondary">{log.date}</td>
                    <td className="p-4 font-semibold text-text-primary">{log.route_name}</td>
                    <td className="p-4 text-xs text-text-primary">{log.changed_by}</td>
                    <td className="p-4 text-xs font-medium text-text-secondary">{log.field}</td>
                    <td className="p-4 text-xs font-mono text-red-500">{log.old_val}</td>
                    <td className="p-4 text-xs font-mono font-bold text-emerald-600">{log.new_val}</td>
                    <td className="p-4 text-xs text-text-secondary">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch Detail Modal */}
      {selectedBatch && (
        <Dialog
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          title={`Batch Details: ${selectedBatch.batch_number}`}
        >
          <div className="space-y-4 text-sm">
            <div className="bg-bg/60 p-4 rounded-xl border border-border grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-secondary block">Destination Sector:</span>
                <span className="font-bold text-text-primary">
                  {selectedBatch.destination_cluster} ({selectedBatch.destination_state})
                </span>
              </div>
              <div>
                <span className="text-text-secondary block">Assigned Transporter:</span>
                <span className="font-bold text-text-primary">{selectedBatch.service_provider}</span>
                <span className="text-text-secondary block font-mono">
                  {selectedBatch.vehicle_type} ({selectedBatch.vehicle_number})
                </span>
              </div>
            </div>

            {/* Cost Comparison Card */}
            <div className="bg-surface p-4 rounded-xl border border-border space-y-2">
              <h4 className="font-bold text-xs uppercase text-text-secondary tracking-wider">
                Cost Variance Analysis
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="p-2 rounded bg-bg border border-border">
                  <span className="text-[11px] text-text-secondary block">Standard Benchmark</span>
                  <span className="text-base font-bold text-text-primary font-mono">
                    ₹ {selectedBatch.benchmark_cost.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-2 rounded bg-bg border border-border">
                  <span className="text-[11px] text-text-secondary block">Proposed Transporter Cost</span>
                  <span className="text-base font-bold text-text-primary font-mono">
                    ₹ {selectedBatch.proposed_cost.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <span className="text-[11px] text-red-600 block">Variance</span>
                  <span className="text-base font-bold text-red-600 font-mono">
                    + ₹ {selectedBatch.difference_amount} (+{selectedBatch.difference_pct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Justification Note */}
            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-xs">
              <span className="font-bold text-amber-700 block mb-1">Dispatcher Override Reason:</span>
              <p className="text-amber-800">{selectedBatch.override_reason}</p>
            </div>

            {/* Orders Included in this Batch */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-text-secondary tracking-wider">
                Orders Consolidated in Batch ({selectedBatch.orders.length})
              </h4>
              <div className="bg-bg rounded-lg border border-border divide-y divide-border/60">
                {selectedBatch.orders.map((o) => (
                  <div key={o.order_no} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-text-primary">{o.order_no}</span> — {o.customer} ({o.kit})
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-secondary font-mono">{o.weight} kg</span>
                      <span className="text-red-500 font-bold">{o.overdue}d overdue</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              {selectedBatch.status === "Pending Approval" ? (
                <>
                  <Button variant="secondary" onClick={() => handleOpenReject(selectedBatch)}>
                    Reject Batch
                  </Button>
                  <Button onClick={() => handleApprove(selectedBatch)}>
                    Authorize & Approve Batch
                  </Button>
                </>
              ) : (
                <Button onClick={() => setSelectedBatch(null)}>Close</Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Reject Modal */}
      {rejectModalBatch && (
        <Dialog
          isOpen={!!rejectModalBatch}
          onClose={() => setRejectModalBatch(null)}
          title={`Reject Dispatch Batch: ${rejectModalBatch.batch_number}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-text-secondary">
              Please specify the reason why this batch rate or vehicle allocation is rejected. The dispatcher will be notified to renegotiate or reassign.
            </p>

            <textarea
              placeholder="e.g. Transporter rate exceeds benchmark limit by 25%. Please request revised quote or assign local fleet..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              required
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setRejectModalBatch(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmReject} className="bg-red-500 hover:bg-red-600">
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
