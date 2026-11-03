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
                    <th className="py-3 px-4 text-center">Total Kits</th>
                    <th className="py-3 px-4 text-center">EPC Allocations</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPoOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-text-primary font-mono text-xs">{po.po_number}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-text-primary">{po.franchisee?.business_name || po.franchisee?.name}</div>
                        <div className="text-[10px] text-text-muted">{po.franchisee?.mobile} · {po.franchisee?.email}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        <div className="font-semibold text-text-primary truncate">{po.items?.[0]?.item_name || "Solar Kit"}</div>
                        <div className="text-[10px] text-text-muted">GST @ {po.items?.[0]?.gst_rate || 18}%</div>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-primary text-sm">
                        {po.total_kit_quantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="font-bold text-text-primary">{po.allocations_count} Buyers</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          {po.allocations_verified_count}/{po.allocations_count} Verified
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-text-primary font-mono text-sm">
                        {fmtINR(po.grand_total_inr)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusPill status={po.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPoOrder(po)}
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

      {/* ── Franchisee PO Order Detail Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedPoOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-text-primary font-mono">{selectedPoOrder.po_number}</h2>
                    <StatusPill status={selectedPoOrder.status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Franchisee: {selectedPoOrder.franchisee?.business_name} · Created on {new Date(selectedPoOrder.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPoOrder(null)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiXCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Partner Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-bg border border-border text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">Contact Person</span>
                    <p className="font-bold text-text-primary mt-0.5">{selectedPoOrder.franchisee?.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">Mobile &amp; Email</span>
                    <p className="font-bold text-text-primary mt-0.5">{selectedPoOrder.franchisee?.mobile}</p>
                    <p className="text-text-muted text-[11px]">{selectedPoOrder.franchisee?.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">GSTIN</span>
                    <p className="font-bold text-text-primary mt-0.5 font-mono">{selectedPoOrder.franchisee?.gst_number || "N/A"}</p>
                  </div>
                </div>

                {/* Items Breakdown */}
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

                {/* EPC Allocations Table */}
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
                    EPC Buyer Allocations &amp; Payment Receipts
                  </h3>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-bg border-b border-border text-[10px] font-black uppercase text-text-muted">
                        <tr>
                          <th className="py-2.5 px-3">EPC Buyer</th>
                          <th className="py-2.5 px-3">GSTIN</th>
                          <th className="py-2.5 px-3 text-center">Allocated Kits</th>
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
                            <td className="py-2.5 px-3 text-center font-black text-primary">{a.allocated_quantity}</td>
                            <td className="py-2.5 px-3 text-center">
                              <StatusPill status={a.payment_status} />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {a.contract?.status === "SIGNED" ? (
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

                {/* Totals Summary */}
                <div className="flex justify-between items-center p-4 rounded-2xl bg-surface-hover border border-border">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Subtotal + Taxes</span>
                    <p className="text-xs text-text-muted font-mono">{fmtINR(selectedPoOrder.subtotal_inr)} + {fmtINR(selectedPoOrder.tax_total_inr)} GST</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Grand Total</span>
                    <p className="text-xl font-black text-text-primary font-mono">{fmtINR(selectedPoOrder.grand_total_inr)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
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
