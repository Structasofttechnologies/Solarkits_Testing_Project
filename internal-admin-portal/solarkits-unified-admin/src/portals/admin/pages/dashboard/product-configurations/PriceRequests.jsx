import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaCoins, FaCheckCircle, FaTimesCircle, FaSpinner, FaSync,
  FaExclamationTriangle, FaBoxOpen, FaSearch, FaHistory,
  FaWarehouse, FaArrowUp
} from "react-icons/fa";
import { HiCube } from "react-icons/hi";
import { getPriceRequests, approvePriceRequest, rejectPriceRequest } from "@/api/priceRequests";
import { setAlert } from "@/features/alert.slice";
import { useDispatch } from "react-redux";
import PageHeader from "@/components/PageHeader";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning border-warning/20 animate-pulse",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-danger/15 text-danger border-danger/20",
};

const STATUS_LABELS = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const fmtCurrency = (n, code = "INR") =>
  `${code === "INR" ? "₹" : code} ${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDate = (dStr) => {
  if (!dStr) return "—";
  const d = new Date(dStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PriceRequests() {
  const dispatch = useDispatch();
  const moduleUniqueId = "ADM_PRICE_REQS";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Reject confirmation modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  // Approve confirmation modal for PO requests
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedApproveReq, setSelectedApproveReq] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPriceRequests(moduleUniqueId);
      if (res && res.status === "success") {
        setRequests(res.data || []);
      } else {
        setError(res?.message || "Failed to load price requests.");
      }
    } catch (err) {
      setError("Network error loading price requests.");
    } finally {
      setLoading(false);
    }
  }, [moduleUniqueId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Derived stats
  const stats = useMemo(() => {
    const s = { total: requests.length, pending: 0, approved: 0, rejected: 0 };
    requests.forEach((r) => {
      if (r.status === "pending") s.pending++;
      else if (r.status === "approved") s.approved++;
      else if (r.status === "rejected") s.rejected++;
    });
    return s;
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      const statusMatch = filterStatus === "all" || req.status === filterStatus;

      const q = searchQuery.toLowerCase();
      const skuCode = req.sku_id?.sku_code?.toLowerCase() || "";
      const prodName = req.sku_id?.product_id?.name?.toLowerCase() || "";
      const reason = req.reason?.toLowerCase() || "";

      const searchMatch =
        !searchQuery ||
        skuCode.includes(q) ||
        prodName.includes(q) ||
        reason.includes(q);

      return statusMatch && searchMatch;
    });
  }, [requests, filterStatus, searchQuery]);

  const handleApprove = async (req, updateBenchmarkPrice = false) => {
    setActionId(req._id);
    try {
      const res = await approvePriceRequest(req._id, moduleUniqueId, { updateBenchmarkPrice });
      if (res && res.status === "success") {
        let msg = req.purchase_order_id
          ? `Buy Above Benchmark request approved. PO #${req.purchase_order_id.po_number || req.purchase_order_id} has been activated.`
          : `Price request approved. Price Master updated for SKU ${req.sku_id?.sku_code || "—"}.`;

        if (req.purchase_order_id && updateBenchmarkPrice) {
          msg = `Buy Above Benchmark request approved (PO #${req.purchase_order_id.po_number || req.purchase_order_id} activated) and SKU benchmark price updated in Price Master.`;
        }

        dispatch(setAlert({ type: "success", message: msg }));
        setRequests((prev) => prev.map((r) => r._id === req._id ? { ...r, status: "approved" } : r));
        setShowApproveModal(false);
        setSelectedApproveReq(null);
      } else {
        dispatch(setAlert({ type: "error", message: res?.message || "Failed to approve request." }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: "Network error approving request." }));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    setActionId(selectedReq._id);
    try {
      const res = await rejectPriceRequest(selectedReq._id, moduleUniqueId);
      if (res && res.status === "success") {
        const msg = selectedReq.purchase_order_id
          ? `Buy Above Benchmark request rejected. Linked PO has been cancelled.`
          : "Price request rejected.";
        dispatch(setAlert({ type: "success", message: msg }));
        setRequests((prev) => prev.map((r) => r._id === selectedReq._id ? { ...r, status: "rejected" } : r));
        setShowRejectModal(false);
        setSelectedReq(null);
      } else {
        dispatch(setAlert({ type: "error", message: res?.message || "Failed to reject request." }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: "Network error rejecting request." }));
    } finally {
      setActionId(null);
    }
  };

  const headerStats = useMemo(() => [
    { label: "Total Requests", value: stats.total },
    { label: "Pending", value: stats.pending },
    { label: "Approved", value: stats.approved },
    { label: "Rejected", value: stats.rejected },
  ], [stats]);

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Benchmark Price Requests"
        subtitle="Review and approve SKU benchmark price updates or purchase order buy-above-benchmark requests."
        icon={FaCoins}
        stats={headerStats}
        actions={
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all active:scale-95 shadow-md"
          >
            <FaSync className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by SKU code, product name or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:border-primary"
          />
          <FaSearch className="absolute left-3.5 top-3 text-text-muted" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize ${
                filterStatus === s
                  ? "gradient-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <FaSpinner className="animate-spin text-3xl text-primary" />
            <span className="text-xs font-semibold">Loading price requests...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center p-6">
            <FaExclamationTriangle className="text-danger text-3xl" />
            <p className="text-xs font-semibold text-danger">{error}</p>
            <button onClick={fetchRequests} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center p-6">
            <FaBoxOpen className="text-text-muted text-3xl" />
            <p className="text-sm font-bold text-text-primary">No requests found</p>
            <p className="text-[10px] text-text-secondary max-w-[220px]">
              {searchQuery || filterStatus !== "all" ? "No results match your filters." : "No benchmark price update requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                  <th className="p-4">SKU</th>
                  <th className="p-4">Warehouse</th>
                  <th className="p-4 text-right">Current Price</th>
                  <th className="p-4 text-right">Requested Price</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filtered.map((req) => {
                  const isUp = req.requested_price > req.current_benchmark_price;
                  const loading_this = actionId === req._id;
                  return (
                    <tr key={req._id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <HiCube className="text-primary shrink-0" />
                          <div>
                            <div className="font-bold text-text-primary">{req.sku_id?.sku_code || "—"}</div>
                            <div className="text-[10px] text-text-muted">{req.sku_id?.product_id?.name || "—"}</div>
                            {req.purchase_order_id && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse">
                                PO: #{req.purchase_order_id.po_number || req.purchase_order_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-text-secondary font-semibold">
                          <FaWarehouse className="text-text-muted shrink-0" />
                          {req.warehouse_id?.name || req.warehouse_id?.warehouse_code || "—"}
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold text-text-secondary">
                        {req.current_benchmark_price > 0 ? fmtCurrency(req.current_benchmark_price) : <span className="text-danger">Not Set</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-black text-text-primary">{fmtCurrency(req.requested_price)}</span>
                          <FaArrowUp className={`text-[9px] ${isUp ? "text-danger" : "text-success rotate-180"}`} />
                        </div>
                      </td>
                      <td className="p-4 max-w-[180px]">
                        <p className="text-text-secondary leading-relaxed line-clamp-2">{req.reason || "—"}</p>
                      </td>
                      <td className="p-4 text-text-muted font-semibold whitespace-nowrap">{fmtDate(req.created_at)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${STATUS_STYLES[req.status] || "bg-bg text-text-muted border-border"}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setSelectedReq(req); setShowRejectModal(true); }}
                              disabled={!!actionId}
                              className="px-2.5 py-1.5 border border-danger/30 text-danger text-[10px] font-bold rounded-lg hover:bg-danger/5 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {loading_this ? <FaSpinner className="animate-spin" /> : "Reject"}
                            </button>
                            <button
                              onClick={() => {
                                if (req.purchase_order_id) {
                                  setSelectedApproveReq(req);
                                  setShowApproveModal(true);
                                } else {
                                  handleApprove(req);
                                }
                              }}
                              disabled={!!actionId}
                              className="px-2.5 py-1.5 gradient-primary text-white text-[10px] font-bold rounded-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {loading_this ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle size={9} /> Approve</>}
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold ${req.status === "approved" ? "text-success" : "text-danger"}`}>
                            {req.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedReq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                <FaTimesCircle className="text-danger" />
                Reject Price Request
              </h4>
              <button onClick={() => { setShowRejectModal(false); setSelectedReq(null); }} className="text-text-muted hover:text-text-primary font-bold text-xs">✕</button>
            </div>

            <div className="bg-bg border border-border/50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">SKU:</span>
                <span className="font-bold text-text-primary">{selectedReq.sku_id?.sku_code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Requested Price:</span>
                <span className="font-bold text-text-primary">{fmtCurrency(selectedReq.requested_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Reason:</span>
                <span className="font-semibold text-text-secondary max-w-[200px] text-right">{selectedReq.reason}</span>
              </div>
            </div>

            <p className="text-xs text-text-secondary">
              {selectedReq.purchase_order_id
                ? `Rejecting this request will keep the benchmark price unchanged and cancel the linked Purchase Order PO #${selectedReq.purchase_order_id.po_number || selectedReq.purchase_order_id}.`
                : "Rejecting this request will keep the current benchmark price unchanged. The operations team will be notified."}
            </p>

            <div className="flex gap-3 pt-2 border-t border-border">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedReq(null); }}
                className="flex-1 py-2 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionId}
                className="flex-1 py-2 rounded-xl bg-danger text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {actionId === selectedReq._id ? <FaSpinner className="animate-spin" /> : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedApproveReq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                <FaCheckCircle className="text-success" />
                Approve Price Request
              </h4>
              <button onClick={() => { setShowApproveModal(false); setSelectedApproveReq(null); }} className="text-text-muted hover:text-text-primary font-bold text-xs">✕</button>
            </div>

            <div className="bg-bg border border-border/50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">SKU:</span>
                <span className="font-bold text-text-primary">{selectedApproveReq.sku_id?.sku_code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Requested Price:</span>
                <span className="font-bold text-text-primary">{fmtCurrency(selectedApproveReq.requested_price)}</span>
              </div>
              {selectedApproveReq.purchase_order_id && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Purchase Order:</span>
                  <span className="font-bold text-text-primary">#{selectedApproveReq.purchase_order_id.po_number || selectedApproveReq.purchase_order_id}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-text-primary font-semibold">
                Do you also want to update the benchmark price (Price Master) with this requested price?
              </p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Selecting <strong>Yes</strong> will approve the PO and update the global benchmark price for this SKU.<br />
                Selecting <strong>No</strong> will only approve this Purchase Order with the requested price (without updating the global benchmark price).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <button
                onClick={() => { setShowApproveModal(false); setSelectedApproveReq(null); }}
                className="py-2 px-4 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-bg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedApproveReq, false)}
                disabled={!!actionId}
                className="py-2 px-4 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {actionId === selectedApproveReq._id ? <FaSpinner className="animate-spin" /> : "No (PO Approve Only)"}
              </button>
              <button
                onClick={() => handleApprove(selectedApproveReq, true)}
                disabled={!!actionId}
                className="flex-1 py-2 px-4 rounded-xl gradient-primary text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {actionId === selectedApproveReq._id ? <FaSpinner className="animate-spin" /> : "Yes (Approve & Update Price)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
