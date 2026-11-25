import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiShoppingCart,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiLoader,
  FiZap,
  FiShoppingBag,
  FiDollarSign,
  FiBox,
  FiUser,
  FiEye,
  FiFileText,
  FiTruck,
  FiLayers,
  FiRefreshCw,
  FiAlertCircle,
  FiExternalLink,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import PoContractModal from "@/components/PoContractModal";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_MGMT";

// ─── Status Badge Helpers ───────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING_ALLOCATION: { label: "Pending Allocation", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  AWAITING_TOKEN_PAYMENT: { label: "Awaiting Token Payment", bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
  PO_STARTED: { label: "PO Started", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  VALIDATING: { label: "Validating...", bg: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800" },
  VALIDATED: { label: "Validated ✓", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  PAID: { label: "Paid", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  paid: { label: "Paid", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  AWAITING_PAYMENT: { label: "Awaiting Payment", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  CONFIRMED: { label: "Confirmed", bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" },
  confirmed: { label: "Confirmed", bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" },
  DISPATCHED: { label: "Dispatched", bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  DELIVERED: { label: "Delivered", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  delivered: { label: "Delivered", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  COMPLETED: { label: "Completed", bg: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800" },
  completed: { label: "Completed", bg: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800" },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  cancelled: { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  PENDING: { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  pending: { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  RECEIPT_SUBMITTED: { label: "Receipt Under Review", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  VERIFIED: { label: "Verified ✓", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || {
    label: status || "Pending",
    bg: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function fmtINR(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ResellerOrders({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("po_orders"); // "po_orders" | "loose_orders"
  const [poOrders, setPoOrders] = useState([]);
  const [looseOrders, setLooseOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [routingFilter, setRoutingFilter] = useState("ALL");

  // Detail Modal
  const [selectedPoOrder, setSelectedPoOrder] = useState(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractModalPoId, setContractModalPoId] = useState(null);
  const [contractModalEpcId, setContractModalEpcId] = useState(null);

  const handleOpenContractModal = (poId, epcId) => {
    setContractModalPoId(poId);
    setContractModalEpcId(epcId);
    setContractModalOpen(true);
  };
  const [selectedLooseOrder, setSelectedLooseOrder] = useState(null);

  // ── Fetch Orders & Stats ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, looseRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/reseller-mgmt/orders/po-orders?req_for=view&unique_id=${MODULE_UID}`, { headers: authHeaderObj() })
          .catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/reseller-mgmt/orders/loose-orders?req_for=view&unique_id=${MODULE_UID}`, { headers: authHeaderObj() })
          .catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/reseller-mgmt/orders/stats?req_for=view&unique_id=${MODULE_UID}`, { headers: authHeaderObj() })
          .catch(() => ({ data: { data: null } })),
      ]);

      if (poRes.data?.status === "success") {
        setPoOrders(poRes.data.data || []);
      }
      if (looseRes.data?.status === "success") {
        setLooseOrders(looseRes.data.data || []);
      }
      if (statsRes.data?.status === "success" && statsRes.data.data) {
        setStats(statsRes.data.data);
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load orders workspace data" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filtered PO Orders ──────────────────────────────────────────────────────
  const filteredPoOrders = poOrders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const num = (o.po_number || "").toLowerCase();
      const partner = (o.franchisee?.business_name || o.franchisee?.name || "").toLowerCase();
      const kitName = (o.items?.[0]?.item_name || "").toLowerCase();
      return num.includes(q) || partner.includes(q) || kitName.includes(q);
    }
    return true;
  });

  // ── Filtered Loose Orders ───────────────────────────────────────────────────
  const filteredLooseOrders = looseOrders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (routingFilter !== "ALL") {
      if (routingFilter === "primary_reseller" && !o.is_franchise_attributed) return false;
      if (routingFilter === "direct_fallback" && o.is_franchise_attributed) return false;
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const num = (o.order_number || "").toLowerCase();
      const buyer = (o.buyer?.name || "").toLowerCase();
      const partner = (o.reseller?.business_name || "").toLowerCase();
      return num.includes(q) || buyer.includes(q) || partner.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiShoppingCart className="text-primary" size={26} />
            Franchisee Orders Workspace
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time management of Franchisee Bulk PO Orders and Loose / Direct EPC kit orders
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin text-primary" : ""} size={15} />
          Refresh Live Data
        </button>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FiLayers size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Orders</div>
            <div className="text-lg font-black text-text-primary mt-0.5">
              {stats?.total_orders_count != null ? stats.total_orders_count : (poOrders.length + looseOrders.length)}
            </div>
            <div className="text-[11px] text-text-muted truncate">
              {poOrders.length} POs · {looseOrders.length} Loose
            </div>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FiDollarSign size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">PO Orders Volume</div>
            <div className="text-lg font-black text-text-primary mt-0.5">
              ₹{((stats?.po_volume_inr || poOrders.reduce((s, o) => s + (o.grand_total_inr || 0), 0)) / 100000).toFixed(2)} L
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
              {stats?.po_paid_count || poOrders.filter((o) => o.status === "PAID").length} Paid / Confirmed
            </div>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center shrink-0">
            <FiBox size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Loose Orders Volume</div>
            <div className="text-lg font-black text-text-primary mt-0.5">
              ₹{((stats?.loose_volume_inr || looseOrders.reduce((s, o) => s + (o.grand_total_inr || 0), 0)) / 100000).toFixed(2)} L
            </div>
            <div className="text-[11px] text-text-muted truncate">
              {looseOrders.length} direct &amp; attributed
            </div>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FiShoppingBag size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Kits Ordered</div>
            <div className="text-lg font-black text-text-primary mt-0.5">
              {poOrders.reduce((s, o) => s + (o.total_kit_quantity || 0), 0) + looseOrders.reduce((s, o) => s + (o.total_kit_quantity || 0), 0)} Kits
            </div>
            <div className="text-[11px] text-text-muted truncate">
              Bulk &amp; loose units
            </div>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FiUser size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Franchise Attributed</div>
            <div className="text-lg font-black text-text-primary mt-0.5">
              {stats?.loose_attributed_count != null ? stats.loose_attributed_count : looseOrders.filter((o) => o.is_franchise_attributed).length} Loose
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold truncate">
              Commission earned
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation ─────────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab("po_orders"); setStatusFilter("ALL"); setSearch(""); }}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${activeTab === "po_orders"
            ? "border-primary text-primary"
            : "border-transparent text-text-muted hover:text-text-primary"
            }`}
        >
          <FiLayers size={17} />
          Franchisee PO Orders
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === "po_orders" ? "bg-primary text-white" : "bg-surface-hover text-text-muted"
            }`}>
            {poOrders.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("loose_orders"); setStatusFilter("ALL"); setSearch(""); }}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${activeTab === "loose_orders"
            ? "border-primary text-primary"
            : "border-transparent text-text-muted hover:text-text-primary"
            }`}
        >
          <FiBox size={17} />
          Loose Orders (Direct &amp; EPC)
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === "loose_orders" ? "bg-primary text-white" : "bg-surface-hover text-text-muted"
            }`}>
            {looseOrders.length}
          </span>
        </button>
      </div>

      {/* ── Filters & Search Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder={activeTab === "po_orders" ? "Search PO #, Franchisee, kit..." : "Search Order #, Buyer, kit..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-bg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          {activeTab === "loose_orders" && (
            <select
              value={routingFilter}
              onChange={(e) => setRoutingFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-bg border border-border text-text-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All Routing Types</option>
              <option value="primary_reseller">Franchisee Attributed</option>
              <option value="direct_fallback">Direct EPC Orders</option>
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg border border-border text-text-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="AWAITING_PAYMENT">Awaiting Payment</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ── Table Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-text-muted gap-3 bg-surface rounded-2xl border border-border">
          <FiLoader className="animate-spin text-primary" size={24} />
          <span className="text-sm font-semibold">Loading live orders data...</span>
        </div>
      ) : activeTab === "po_orders" ? (
        /* ── Franchisee PO Orders Table ────────────────────────────────────── */
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          {filteredPoOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center text-text-muted">
                <FiLayers size={24} />
              </div>
              <p className="text-sm text-text-muted font-medium">No Franchisee Purchase Orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg border-b border-border text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="py-3 px-4">PO Number &amp; Date</th>
                    <th className="py-3 px-4">Franchisee Partner</th>
                    <th className="py-3 px-4">Kit Item Details</th>
                    <th className="py-3 px-4 text-center">Total Quota</th>
                    <th className="py-3 px-4 text-center">EPC &amp; Drawdowns</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPoOrders.map((po) => {
                    const bookedQuota = po.total_booked_quantity || po.total_kit_quantity || 0;
                    const fulfilledQuota = po.fulfilled_quantity || 0;
                    const remainingQuota = po.remaining_quantity != null ? po.remaining_quantity : Math.max(0, bookedQuota - fulfilledQuota);
                    const progressPct = bookedQuota > 0 ? Math.min(100, Math.round((fulfilledQuota / bookedQuota) * 100)) : 0;
                    const repeatCount = (po.linked_repeat_orders || []).length || po.repeat_orders_count || 0;

                    return (
                      <tr key={po._id} className="hover:bg-surface-hover/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-text-primary font-mono text-xs">{po.po_number}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            {new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Franchise Master PO
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-text-primary">{po.franchisee?.business_name || po.franchisee?.name}</div>
                          <div className="text-[10px] text-text-muted">{po.franchisee?.mobile} · {po.franchisee?.email}</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate">
                          <div className="font-semibold text-text-primary truncate">{po.items?.[0]?.item_name || "Solar Kit"}</div>
                          <div className="text-[10px] text-text-muted">GST @ {po.items?.[0]?.gst_rate || 5}%</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-black text-primary text-sm">
                            {bookedQuota} Kits
                          </div>
                          <div className="w-24 bg-surface-hover rounded-full h-1.5 mx-auto my-1 overflow-hidden border border-border">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                          <div className="text-[10px] text-text-muted font-medium">
                            <span className="text-emerald-600 font-bold">{fulfilledQuota} fulfilled</span> · {remainingQuota} left
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-text-primary">{po.allocations_count} EPC Buyer(s)</div>
                          {repeatCount > 0 ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                              ⚡ {repeatCount} Drawdown(s)
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              {po.allocations_verified_count}/{po.allocations_count} Verified
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-text-primary font-mono text-sm">
                            {fmtINR(po.grand_total_inr)}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            Token: <span className="font-mono text-emerald-600 font-bold">₹{(po.token_paid_inr || po.token_amount_inr || 0).toLocaleString("en-IN")}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusPill status={po.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedPoOrder(po)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            <FiEye size={13} />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}</tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Loose Orders Table ────────────────────────────────────────────── */
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          {filteredLooseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center text-text-muted">
                <FiBox size={24} />
              </div>
              <p className="text-sm text-text-muted font-medium">No Loose or Direct EPC orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg border-b border-border text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="py-3 px-4">Order Number &amp; Date</th>
                    <th className="py-3 px-4">Routing &amp; Type</th>
                    <th className="py-3 px-4">Attributed Franchisee</th>
                    <th className="py-3 px-4">EPC Buyer Name</th>
                    <th className="py-3 px-4 text-center">Kits</th>
                    <th className="py-3 px-4 text-right">Order Amount</th>
                    <th className="py-3 px-4 text-right">Franchise Margin</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLooseOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-text-primary font-mono text-xs">{o.order_number}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {o.is_franchise_attributed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Franchise Attributed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            Direct EPC Order
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {o.reseller ? (
                          <div>
                            <div className="font-bold text-text-primary">{o.reseller.business_name}</div>
                            <div className="text-[10px] text-text-muted">{o.reseller.mobile}</div>
                          </div>
                        ) : (
                          <span className="text-text-muted italic text-[11px]">Direct SolarShop</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-text-primary">{o.buyer?.name}</div>
                        <div className="text-[10px] text-text-muted">{o.buyer?.mobile || o.buyer?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-primary text-sm">
                        {o.total_kit_quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-text-primary font-mono text-sm">
                        {fmtINR(o.grand_total_inr)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono text-sm">
                        {o.reseller_margin_inr > 0 ? fmtINR(o.reseller_margin_inr) : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusPill status={o.payment_status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLooseOrder(o)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <FiEye size={13} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Franchisee PO Order Detail Modal (Unified Single Card) ────────────────────── */}
      <AnimatePresence>
        {selectedPoOrder && (() => {
          const bookedQuota = selectedPoOrder.total_booked_quantity || selectedPoOrder.total_kit_quantity || 0;
          const fulfilledQuota = selectedPoOrder.fulfilled_quantity || 0;
          const remainingQuota = selectedPoOrder.remaining_quantity != null ? selectedPoOrder.remaining_quantity : Math.max(0, bookedQuota - fulfilledQuota);
          const progressPct = bookedQuota > 0 ? Math.min(100, Math.round((fulfilledQuota / bookedQuota) * 100)) : 0;
          const tokenRequired = selectedPoOrder.token_amount_inr || 0;
          const tokenPaid = selectedPoOrder.token_paid_inr || selectedPoOrder.token_amount_inr || 0;
          const tokenAdjusted = selectedPoOrder.token_adjusted_inr || 0;
          const escrowBalance = selectedPoOrder.token_balance_inr != null ? selectedPoOrder.token_balance_inr : Math.max(0, tokenPaid - tokenAdjusted);
          const repeatOrdersList = selectedPoOrder.linked_repeat_orders || [];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface rounded-3xl border-2 border-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-md z-10">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-text-primary font-mono">{selectedPoOrder.po_number}</h2>
                      <StatusPill status={selectedPoOrder.status} />
                      <span className="text-xs text-text-muted">
                        Created on {new Date(selectedPoOrder.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Franchisee: <strong className="text-text-primary">{selectedPoOrder.franchisee?.business_name || selectedPoOrder.franchisee?.name}</strong> · Tel: {selectedPoOrder.franchisee?.mobile || "N/A"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPoOrder(null)}
                    className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <FiXCircle size={22} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* 1. Live Quota & Escrow Token Status Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Quota Progress */}
                    <div className="p-4 rounded-2xl bg-bg border border-border flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <FiLayers className="text-primary" size={14} /> Master PO Quota Lock
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {progressPct}% Fulfilled
                        </span>
                      </div>
                      <div className="my-2">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-2xl font-black text-text-primary font-mono">{remainingQuota} Kits</span>
                          <span className="text-xs text-text-muted font-medium">of {bookedQuota} Kits Quota</span>
                        </div>
                        <div className="w-full bg-surface-hover rounded-full h-2.5 overflow-hidden border border-border">
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px] text-text-muted mt-2 pt-2 border-t border-border/50">
                        <span>Fulfilled: <strong className="text-emerald-600 font-mono">{fulfilledQuota} Kits</strong></span>
                        <span>Remaining Available: <strong className="text-primary font-mono">{remainingQuota} Kits</strong></span>
                      </div>
                    </div>

                    {/* Right: Token & Escrow Details */}
                    <div className="p-4 rounded-2xl bg-bg border border-border flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <FiDollarSign className="text-emerald-600" size={14} /> Token Deposit &amp; Escrow
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {selectedPoOrder.token_payment_status || "PAID"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 my-2 text-center">
                        <div className="p-2 rounded-xl bg-surface border border-border">
                          <span className="text-[10px] text-text-muted uppercase font-bold">Total Token</span>
                          <p className="text-xs font-black text-text-primary font-mono mt-0.5">₹{tokenRequired.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-surface border border-border">
                          <span className="text-[10px] text-text-muted uppercase font-bold">Adjusted</span>
                          <p className="text-xs font-black text-rose-600 font-mono mt-0.5">-₹{tokenAdjusted.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-surface border border-border">
                          <span className="text-[10px] text-text-muted uppercase font-bold">Escrow Balance</span>
                          <p className="text-xs font-black text-emerald-600 font-mono mt-0.5">₹{escrowBalance.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                        <FiCheckCircle size={12} className="text-emerald-500 shrink-0" />
                        <span>Token is pro-rata adjusted on each repeat kit drawdown.</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Line Items Breakdown */}
                  <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">Line Items Breakdown</h3>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-bg border-b border-border text-[10px] font-black uppercase text-text-muted">
                          <tr>
                            <th className="py-2.5 px-3">Item Name</th>
                            <th className="py-2.5 px-3 text-center">Quantity</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-3 text-right">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(selectedPoOrder.items || []).map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 px-3 font-semibold text-text-primary">
                                {it.item_name}
                                <div className="text-[10px] text-text-muted">GST: {it.gst_rate}%</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-primary">{it.quantity} Kits</td>
                              <td className="py-2.5 px-3 text-right font-mono">{fmtINR(it.unit_price_inr)}</td>
                              <td className="py-2.5 px-3 text-right font-black font-mono">{fmtINR(it.total_price_inr)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. EPC Allocations & Legal Contract Table */}
                  <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
                      EPC Buyer Allocations &amp; Legal Contract Signatures
                    </h3>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-bg border-b border-border text-[10px] font-black uppercase text-text-muted">
                          <tr>
                            <th className="py-2.5 px-3">EPC Buyer</th>
                            <th className="py-2.5 px-3">GSTIN</th>
                            <th className="py-2.5 px-3 text-center">Allocated Quota</th>
                            <th className="py-2.5 px-3 text-center">Payment Status</th>
                            <th className="py-2.5 px-3 text-center">Legal Contract</th>
                            <th className="py-2.5 px-3 text-right">Receipt Proof</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {((selectedPoOrder.items?.[0]?.epc_allocations) || []).map((a, aIdx) => (
                            <tr key={aIdx}>
                              <td className="py-2.5 px-3 font-bold text-text-primary">{a.company_name || a.buyer_name}</td>
                              <td className="py-2.5 px-3 font-mono text-text-muted text-[11px]">{a.gstin || "N/A"}</td>
                              <td className="py-2.5 px-3 text-center font-black text-primary">{a.allocated_quantity} Kits</td>
                              <td className="py-2.5 px-3 text-center">
                                <StatusPill status={a.payment_status} />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {a.contract?.status === "SIGNED" || selectedPoOrder.status === "VALIDATED" || selectedPoOrder.status === "PO_STARTED" || selectedPoOrder.status === "PAID" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenContractModal(selectedPoOrder._id, a.epc_buyer_id?._id || a.epc_buyer_id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                                    title="View Digitally Signed Contract & OTP Verification"
                                  >
                                    <FiCheckCircle size={11} className="text-emerald-600" />
                                    <span>Signed ✓</span>
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <FiClock size={10} /> Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {a.payment_receipt_url ? (
                                  <a
                                    href={a.payment_receipt_url.startsWith("http") ? a.payment_receipt_url : `http://localhost:5000${a.payment_receipt_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-2xs"
                                  >
                                    📄 View Receipt
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-text-muted italic">Receipt not uploaded</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Linked Loose Orders & Repeat Drawdowns Placed Under This PO Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <FiShoppingCart className="text-primary" size={13} />
                        Reorders &amp; Drawdowns Placed Under PO: <span className="font-mono text-primary font-black">{selectedPoOrder.po_number}</span>
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {repeatOrdersList.length} Order(s) Drawn
                      </span>
                    </div>

                    {repeatOrdersList.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-bg border border-dashed border-border text-center">
                        <FiBox className="mx-auto text-text-muted mb-2" size={24} />
                        <p className="text-xs font-bold text-text-primary">No Repeat Drawdowns Placed Yet</p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          All loose kit deliveries drawn by EPCs against this PO quota will appear here in real-time.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-bg border-b border-border text-[10px] font-black uppercase text-text-muted">
                            <tr>
                              <th className="py-2.5 px-3">Order Ref #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">EPC Buyer</th>
                              <th className="py-2.5 px-3 text-center">Kits Drawn</th>
                              <th className="py-2.5 px-3 text-right">Token Adjusted</th>
                              <th className="py-2.5 px-3 text-right">Net Paid</th>
                              <th className="py-2.5 px-3 text-center">Payment UTR</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {repeatOrdersList.map((ro, rIdx) => (
                              <tr key={rIdx} className="hover:bg-surface-hover/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-text-primary">{ro.order_number || ro.po_number}</td>
                                <td className="py-2.5 px-3 text-text-muted text-[11px]">
                                  {new Date(ro.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-text-primary">{ro.epc_name || "EPC Contractor"}</td>
                                <td className="py-2.5 px-3 text-center font-black text-primary">{ro.quantity} Kits</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                                  {ro.token_adjusted_inr > 0 ? `-₹${ro.token_adjusted_inr.toLocaleString("en-IN")}` : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-black text-text-primary">
                                  ₹{(ro.net_payable_inr || ro.grand_total_inr || 0).toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] text-text-muted">
                                  {ro.payment_utr || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <StatusPill status={ro.status} />
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {ro.payment_receipt_url ? (
                                    <a
                                      href={ro.payment_receipt_url.startsWith("http") ? ro.payment_receipt_url : `http://localhost:5000${ro.payment_receipt_url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                                    >
                                      📄 View
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-text-muted italic">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Totals Summary */}
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-surface-hover border border-border">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase">Subtotal + Taxes</span>
                      <p className="text-xs text-text-muted font-mono">{fmtINR(selectedPoOrder.subtotal_inr)} + {fmtINR(selectedPoOrder.tax_total_inr)} GST</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-text-muted uppercase">PO Grand Total (Total Landed)</span>
                      <p className="text-xl font-black text-text-primary font-mono">{fmtINR(selectedPoOrder.grand_total_inr)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Loose Order Detail Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLooseOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-text-primary font-mono">{selectedLooseOrder.order_number}</h2>
                    <StatusPill status={selectedLooseOrder.payment_status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedLooseOrder.is_franchise_attributed ? "Franchisee Attributed" : "Direct EPC Order"} · Placed on {new Date(selectedLooseOrder.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLooseOrder(null)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiXCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Buyer & Reseller Info */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-bg border border-border text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">Buyer Details</span>
                    <p className="font-bold text-text-primary mt-0.5">{selectedLooseOrder.buyer?.name}</p>
                    <p className="text-text-muted text-[11px]">{selectedLooseOrder.buyer?.mobile} · {selectedLooseOrder.buyer?.email}</p>
                    <p className="font-mono text-text-muted text-[10px] mt-0.5">GSTIN: {selectedLooseOrder.buyer?.gstin || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">Attributed Franchisee</span>
                    {selectedLooseOrder.reseller ? (
                      <>
                        <p className="font-bold text-text-primary mt-0.5">{selectedLooseOrder.reseller.business_name}</p>
                        <p className="text-text-muted text-[11px]">{selectedLooseOrder.reseller.mobile}</p>
                      </>
                    ) : (
                      <p className="text-text-muted italic text-[11px] mt-0.5">Direct SolarShop Portal</p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Ordered Kit Items</h3>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-bg border-b border-border text-[10px] font-black uppercase text-text-muted">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(selectedLooseOrder.items || []).map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-semibold text-text-primary">{it.item_name}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-primary">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{fmtINR(it.unit_price_inr)}</td>
                            <td className="py-2.5 px-3 text-right font-black font-mono">{fmtINR(it.total_price_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Delivery Address & Totals */}
                <div className="flex justify-between items-center p-4 rounded-2xl bg-surface-hover border border-border">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Delivery Address</span>
                    <p className="text-xs text-text-primary font-medium">{selectedLooseOrder.delivery_address?.line || "Standard Warehouse Dispatch"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Grand Total Amount</span>
                    <p className="text-lg font-black text-text-primary font-mono">{fmtINR(selectedLooseOrder.grand_total_inr)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal PO Legal Contract Modal */}
      <PoContractModal
        isOpen={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        poId={contractModalPoId}
        epcBuyerId={contractModalEpcId}
      />
    </div>
  );
}
