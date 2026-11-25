import { useState, useEffect } from "react";
import {
  MdSearch,
  MdRefresh,
  MdCheckCircle,
  MdPending,
  MdErrorOutline,
} from "react-icons/md";
import { FaHandshake } from "react-icons/fa";
import { getEpcPoPayments, verifyEpcPoPayment } from "../../api/solarshopAccounts";
import Button from "../../components/Button";

export default function EpcPoPaymentsAccounts() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingAlloc, setUpdatingAlloc] = useState(null);
  const [updatingPoId, setUpdatingPoId] = useState(null);
  const [newStatus, setNewStatus] = useState("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getEpcPoPayments();
      if (res.status === "success") {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching EPC PO payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (poId, alloc) => {
    setUpdatingPoId(poId);
    setUpdatingAlloc(alloc);
    setNewStatus("approve");
    setRejectionReason("");
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!updatingAlloc || !updatingPoId) return;
    setSubmittingStatus(true);
    try {
      await verifyEpcPoPayment(updatingPoId, updatingAlloc.epc_buyer_id, {
        action: newStatus,
        reason: rejectionReason
      });
      setStatusModalOpen(false);
      fetchPayments();
    } catch (err) {
      console.error("Error updating PO payment status:", err);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <MdCheckCircle size={13} className="text-emerald-500" />
          Verified
        </span>
      );
    }
    if (s === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <MdPending size={13} className="text-amber-500" />
          Pending
        </span>
      );
    }
    if (s === "RECEIPT_SUBMITTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
          <MdCheckCircle size={13} className="text-blue-500" />
          Receipt Submitted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <FaHandshake /> EPC PO Allocations
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            EPC PO Payments
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Verify payment receipts submitted by EPC buyers for their allocated PO inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            className="text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-bg-alt text-text-muted text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-5 py-4">PO Number & Item</th>
                <th className="px-5 py-4">Franchisee</th>
                <th className="px-5 py-4">EPC Buyer</th>
                <th className="px-5 py-4">Allocated Qty</th>
                <th className="px-5 py-4">Receipt</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-text-muted">
                    Loading payments...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center">
                      <MdPending size={40} className="mb-2 text-slate-300" />
                      <p>No EPC PO Payments found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const allocationsToRender = [];
                  order.items?.forEach(item => {
                    item.epc_allocations?.forEach(alloc => {
                      if (["RECEIPT_SUBMITTED", "VERIFIED"].includes(alloc.payment_status)) {
                        allocationsToRender.push({ order, item, alloc });
                      }
                    });
                  });

                  return allocationsToRender.map(({ order, item, alloc }, idx) => (
                    <tr key={`${order._id}-${idx}`} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-text-primary">{order.po_number}</div>
                        <div className="text-xs text-text-muted mt-0.5 max-w-[200px] truncate">{item.item_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-text-primary">{order.franchisee_id?.business_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-text-primary">{alloc.company_name || 'N/A'}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{alloc.gstin || 'N/A'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-semibold">{alloc.allocated_quantity}</div>
                      </td>
                      <td className="px-5 py-4">
                        {alloc.payment_receipt_url ? (
                          <a href={import.meta.env.VITE_API_URL + alloc.payment_receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                            View Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-text-muted">No Receipt</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {renderStatusBadge(alloc.payment_status)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {alloc.payment_status === "RECEIPT_SUBMITTED" && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-[11px] px-3 py-1.5 h-auto rounded-lg font-bold"
                            onClick={() => handleOpenStatusModal(order._id, alloc)}
                          >
                            Review
                          </Button>
                        )}
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModalOpen && updatingAlloc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in slide-in-bottom-4">
            <div className="p-5 border-b border-border">
              <h3 className="font-bold text-lg text-text-primary">Verify Payment</h3>
              <p className="text-xs text-text-muted mt-1">
                Approve or Reject the payment receipt submitted by {updatingAlloc.company_name || 'EPC Buyer'}.
              </p>
            </div>
            <form onSubmit={handleSaveStatus} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Action
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-bg-alt border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="approve">Approve Payment</option>
                  <option value="reject">Reject Receipt</option>
                </select>
              </div>

              {newStatus === "reject" && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Rejection Reason
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-alt border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter reason for rejection..."
                    required
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button
                  variant="outline"
                  type="button"
                  className="flex-1"
                  onClick={() => setStatusModalOpen(false)}
                  disabled={submittingStatus}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="flex-1"
                  disabled={submittingStatus}
                >
                  {submittingStatus ? "Saving..." : "Confirm Action"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
