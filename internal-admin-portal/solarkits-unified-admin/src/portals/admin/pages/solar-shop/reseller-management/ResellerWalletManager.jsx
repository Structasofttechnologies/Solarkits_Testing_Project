import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiCreditCard, FiDollarSign, FiClock, FiCheckCircle, FiXCircle,
  FiSearch, FiLoader, FiArrowUpRight, FiArrowDownLeft, FiFileText,
  FiShield, FiRefreshCw, FiAlertCircle, FiDownload, FiEye,
  FiTrendingUp, FiMinusCircle, FiTag, FiCopy, FiCheck
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE   = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_WALLET";

const apiFetch = (method, endpoint, data) =>
  axios({ method, url: `${API_BASE}/reseller-mgmt/wallet${endpoint}`, headers: authHeaderObj(), data });

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function shortId(id) {
  return String(id || "").slice(-8).toUpperCase();
}

// ─── Status Badges ────────────────────────────────────────────────────────────
const STATUS_BADGES = {
  paid:       { label: "Paid",           bg: "bg-success-soft",  text: "text-success",  icon: FiCheckCircle },
  processing: { label: "Processing",     bg: "bg-info-soft",     text: "text-info",     icon: FiLoader      },
  pending:    { label: "Pending Review", bg: "bg-warning-soft",  text: "text-warning",  icon: FiClock       },
  rejected:   { label: "Rejected",       bg: "bg-danger-soft",   text: "text-danger",   icon: FiXCircle     },
  failed:     { label: "Failed",         bg: "bg-danger-soft",   text: "text-danger",   icon: FiAlertCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_BADGES[status] || STATUS_BADGES.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border border-current/20`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function CommissionStatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  if (s === "SETTLED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <FiCheckCircle size={11} /> Settled
      </span>
    );
  }
  if (s === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
        <FiCheckCircle size={11} /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
      <FiClock size={11} /> Pending Settlement
    </span>
  );
}

// ─── Process Payout Modal ─────────────────────────────────────────────────────
function ProcessPayoutModal({ payout, onClose, onProcessed }) {
  const dispatch   = useDispatch();
  const [decision, setDecision] = useState("paid");
  const [txnRef,   setTxnRef]   = useState("");
  const [reason,   setReason]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amountInr = payout.amount_paise
    ? Math.round(payout.amount_paise) / 100
    : (payout.amount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("put", `/payouts/process/${payout.id || payout._id}?req_for=edit&unique_id=${MODULE_UID}`, {
        decision,
        transaction_reference: txnRef.trim() || undefined,
        rejection_reason:      reason.trim() || undefined,
      });

      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message || `Payout ${decision}` }));
        onProcessed();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Operation failed" }));
        setSubmitting(false);
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Operation failed" }));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Process Reseller Payout</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <FiXCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-bg border border-border space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Reseller</span>
              <span className="font-semibold text-text-primary">{payout.reseller_id?.business_name || payout.reseller?.business_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Email / Mobile</span>
              <span className="text-xs text-text-secondary">{payout.reseller_id?.email || payout.reseller?.email} · {payout.reseller_id?.mobile || payout.reseller?.mobile}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">PAN</span>
              <span className="font-mono text-xs text-text-secondary">{payout.reseller_id?.pan_number || "—"}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Requested Amount</span>
              <span className="text-2xl font-black text-primary">{fmt(amountInr)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Request ID</span>
              <span className="font-mono text-xs text-text-muted">{shortId(payout.id || payout._id)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Requested On</span>
              <span className="text-xs text-text-secondary">{fmtDate(payout.created_at)}</span>
            </div>
          </div>

          {payout.bank_details_snapshot && (
            <div className="p-3.5 rounded-xl bg-bg border border-border font-mono text-xs text-text-secondary space-y-0.5">
              <div className="font-semibold text-text-primary">Bank: {payout.bank_details_snapshot.bank_name}</div>
              <div>A/C: {payout.bank_details_snapshot.account_number} &nbsp;·&nbsp; IFSC: {payout.bank_details_snapshot.ifsc_code}</div>
              <div>Holder: {payout.bank_details_snapshot.account_holder_name}</div>
            </div>
          )}

          {payout.wallet_balance_at_request && (
            <div className="p-3 rounded-xl bg-warning-soft border border-warning/20 text-xs font-semibold text-warning space-y-0.5">
              <div className="font-bold mb-1">Balance at time of request:</div>
              <div>Available: {fmt((payout.wallet_balance_at_request.available_balance_paise || 0) / 100)}</div>
              <div>Pending Holds: {fmt((payout.wallet_balance_at_request.pending_balance_paise || 0) / 100)}</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Payout Decision <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("paid")}
                className={`p-3 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  decision === "paid" ? "border-success bg-success-soft text-success shadow-sm" : "border-border bg-bg text-text-muted"
                }`}
              >
                <FiCheckCircle size={15} /> Approve &amp; Mark Paid
              </button>
              <button
                type="button"
                onClick={() => setDecision("rejected")}
                className={`p-3 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  decision === "rejected" ? "border-danger bg-danger-soft text-danger shadow-sm" : "border-border bg-bg text-text-muted"
                }`}
              >
                <FiXCircle size={15} /> Reject Request
              </button>
            </div>
          </div>

          {decision === "paid" ? (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Bank UTR / Transaction Reference
              </label>
              <input
                type="text"
                placeholder="e.g. UTR1234567890 / IMPS / NEFT Ref"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Rejection Reason <span className="text-danger">*</span>
              </label>
              <textarea
                placeholder="Provide a clear reason for rejecting this payout request..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-danger/30 resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (decision === "rejected" && !reason.trim())}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <FiLoader className="animate-spin" size={16} /> : null}
              {submitting ? "Processing…" : "Confirm Decision"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Mark Failed Modal ────────────────────────────────────────────────────────
function MarkFailedModal({ payout, onClose, onProcessed }) {
  const dispatch   = useDispatch();
  const [reason,   setReason]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("put", `/payouts/mark-failed/${payout.id || payout._id}?req_for=edit&unique_id=${MODULE_UID}`, {
        reason: reason.trim() || "Payout failed at bank/provider",
      });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Payout marked as failed. Funds returned to reseller." }));
        onProcessed();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Operation failed" }));
        setSubmitting(false);
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Operation failed" }));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-danger flex items-center gap-2">
          <FiAlertCircle /> Mark Payout as Failed
        </h3>
        <p className="text-sm text-text-secondary">
          Funds of <strong>{fmt(payout.amount_paise ? payout.amount_paise / 100 : payout.amount)}</strong> will be safely returned to the reseller's available balance.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            placeholder="Failure reason (e.g. Bank account closed, incorrect IFSC)"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-danger/30 resize-none"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <FiLoader className="animate-spin" size={15} />}
              Confirm Failure
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function ResellerWalletManager({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const [activeTab,          setActiveTab]          = useState("commissions");
  const [commissions,        setCommissions]        = useState([]);
  const [commissionSummary,  setCommissionSummary]  = useState(null);
  const [wallets,            setWallets]            = useState([]);
  const [ledgers,            setLedgers]            = useState([]);
  const [payouts,            setPayouts]            = useState([]);
  const [webhooks,           setWebhooks]           = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [statusFilter,       setStatusFilter]       = useState("");
  const [search,             setSearch]             = useState("");
  const [selectedPayout,     setSelectedPayout]     = useState(null);
  const [failedPayout,       setFailedPayout]       = useState(null);
  const [exporting,          setExporting]          = useState(false);
  const [copiedId,           setCopiedId]           = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchCommissions = useCallback(async () => {
    try {
      let url = `${API_BASE}/reseller-mgmt/wallet/commissions?req_for=view&unique_id=${MODULE_UID}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setCommissions(res.data.data || []);
        if (res.data.summary) setCommissionSummary(res.data.summary);
      }
    } catch { /* ignore */ }
  }, [statusFilter]);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/reseller-mgmt/wallet/list?req_for=view&unique_id=${MODULE_UID}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") setWallets(res.data.data || []);
    } catch { /* silently ignore */ }
  }, []);

  const fetchLedgers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/reseller-mgmt/wallet/ledgers?req_for=view&unique_id=${MODULE_UID}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") setLedgers(res.data.data || []);
    } catch { /* silently ignore */ }
  }, []);

  const fetchPayouts = useCallback(async () => {
    try {
      let url = `${API_BASE}/reseller-mgmt/wallet/payouts?req_for=view&unique_id=${MODULE_UID}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") setPayouts(res.data.data || []);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load payout requests" }));
    }
  }, [dispatch, statusFilter]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/reseller-mgmt/webhook-logs`, { headers: authHeaderObj() });
      if (res.data?.status === "success") setWebhooks(res.data.data || []);
    } catch { /* silently ignore */ }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchCommissions(),
      fetchWallets(),
      fetchLedgers(),
      fetchPayouts(),
    ]);
    setLoading(false);
  }, [fetchCommissions, fetchWallets, fetchLedgers, fetchPayouts]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      let url = `${API_BASE}/reseller-mgmt/wallet/export-payouts?req_for=view&unique_id=${MODULE_UID}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await axios.get(url, { headers: authHeaderObj(), responseType: "blob" });
      const href = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = href;
      a.download = `payout_requests_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      dispatch(setAlert({ type: "error", message: "Export failed" }));
    } finally {
      setExporting(false);
    }
  };

  const walletKpis = wallets.reduce(
    (acc, w) => ({
      grossEarned:   acc.grossEarned   + (w.breakdown?.gross_earned_inr || 0),
      tdsDeducted:   acc.tdsDeducted   + (w.breakdown?.tds_deducted_inr || 0),
      netEarned:     acc.netEarned     + (w.breakdown?.net_earned_inr   || 0),
      available:     acc.available     + (w.available_balance || 0),
      pending:       acc.pending       + (w.pending_balance   || 0),
      withdrawn:     acc.withdrawn     + (w.total_withdrawn   || 0),
    }),
    { grossEarned: 0, tdsDeducted: 0, netEarned: 0, available: 0, pending: 0, withdrawn: 0 }
  );

  const grossDisplay   = commissionSummary?.total_gross_commission_inr ?? commissionSummary?.gross_earned ?? walletKpis.grossEarned;
  const tdsDisplay     = commissionSummary?.total_tds_deducted_inr ?? commissionSummary?.tds_deducted ?? walletKpis.tdsDeducted;
  const netDisplay     = commissionSummary?.total_net_payout_inr ?? commissionSummary?.net_earned ?? walletKpis.netEarned;
  const settledDisplay = commissionSummary?.total_settled_inr ?? commissionSummary?.settled_amount ?? 0;
  const pendingDisplay = commissionSummary?.total_pending_inr ?? commissionSummary?.pending_amount ?? walletKpis.pending;

  const pendingPayoutCount = payouts.filter((p) => p.status === "pending").length;

  const filteredCommissions = commissions.filter((c) => {
    const po    = (c.po_number || "").toLowerCase();
    const name  = (c.franchisee_name || "").toLowerCase();
    const pName = (c.partner_name || "").toLowerCase();
    const bank  = (c.bank_details?.bank_name || "").toLowerCase();
    const ac    = (c.bank_details?.account_number || "").toLowerCase();
    const q     = search.toLowerCase();
    const matchesSearch = !q || po.includes(q) || name.includes(q) || pName.includes(q) || bank.includes(q) || ac.includes(q);
    const matchesStatus = !statusFilter || String(c.status).toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredPayouts = payouts.filter((p) => {
    const name  = (p.reseller_id?.business_name || p.reseller?.business_name || "").toLowerCase();
    const email = (p.reseller_id?.email || p.reseller?.email || "").toLowerCase();
    const txn   = (p.utr_reference || p.transaction_reference || "").toLowerCase();
    const id    = String(p.id || p._id || "").toLowerCase();
    const q     = search.toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || txn.includes(q) || id.includes(q);
    const matchesStatus = !statusFilter || String(p.status).toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredLedgers = ledgers.filter((l) => {
    const name = (l.reseller_id?.business_name || "").toLowerCase();
    const desc = (l.description || "").toLowerCase();
    const cat  = (l.category || "").toLowerCase();
    const ref  = (l.reference_id || "").toLowerCase();
    const q    = search.toLowerCase();
    return !q || name.includes(q) || desc.includes(q) || cat.includes(q) || ref.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiTrendingUp className="text-primary" size={24} />
            Franchisee Commissions &amp; Wallet Ledgers
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Accounts-synced commissions · Section 194H 5% TDS · Beneficiary bank payouts &amp; double-entry ledgers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingPayoutCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-warning-soft text-warning text-xs font-bold animate-pulse">
              {pendingPayoutCount} Payout Requests
            </span>
          )}
          <button onClick={refreshAll} className="p-2.5 rounded-xl border border-border text-text-muted hover:bg-surface-hover transition-colors" title="Refresh Live Data">
            <FiRefreshCw size={16} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {exporting ? <FiLoader className="animate-spin" size={14} /> : <FiDownload size={14} />}
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: FiTrendingUp,    bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Gross Commissions", value: fmt(grossDisplay) },
          { icon: FiMinusCircle,   bg: "bg-rose-500/10",    text: "text-rose-500",    label: "TDS (5% Sec 194H)",   value: fmt(tdsDisplay) },
          { icon: FiArrowUpRight,  bg: "bg-blue-500/10",    text: "text-blue-500",    label: "Net Commissions",     value: fmt(netDisplay) },
          { icon: FiDollarSign,    bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Wallet Available",    value: fmt(walletKpis.available) },
          { icon: FiCheckCircle,   bg: "bg-teal-500/10",    text: "text-teal-500",    label: "Settled Payouts",     value: fmt(settledDisplay) },
          { icon: FiClock,         bg: "bg-amber-500/10",   text: "text-amber-500",   label: "Pending Payouts",     value: fmt(pendingDisplay) },
        ].map(({ icon: Icon, bg, text, label, value }) => (
          <div key={label} className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center shrink-0`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider truncate">{label}</div>
              <div className="text-base font-bold text-text-primary mt-0.5 truncate">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-border overflow-x-auto gap-2">
        {[
          { key: "commissions", icon: FiTrendingUp,  label: `Franchisee Commissions (${commissions.length})`, badge: commissionSummary?.pending_count ? `${commissionSummary.pending_count} Pending` : null },
          { key: "wallets",     icon: FiCreditCard,  label: `Franchisee Wallets (${wallets.length})` },
          { key: "ledgers",     icon: FiFileText,    label: `Audit Ledgers (${ledgers.length})` },
          { key: "payouts",     icon: FiClock,       label: `Payout Requests (${payouts.length})`, badge: pendingPayoutCount > 0 ? `${pendingPayoutCount}` : null },
          { key: "webhooks",    icon: FiShield,      label: "Webhook Logs" },
        ].map(({ key, icon: Icon, label, badge }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setStatusFilter("");
              if (key === "webhooks") fetchWebhooks();
            }}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === key
                ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-hover/50 rounded-t-xl"
            }`}
          >
            <Icon size={16} />
            {label}
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab !== "webhooks" && (
        <div className="flex flex-col md:flex-row gap-3 bg-surface p-4 rounded-2xl border border-border shadow-sm">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder={
                activeTab === "commissions"
                  ? "Search by PO#, Franchisee, Partner, Bank A/C, IFSC..."
                  : activeTab === "ledgers"
                  ? "Search by reseller, description, reference..."
                  : "Search by reseller, email, UTR reference..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {(activeTab === "commissions" || activeTab === "payouts") && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Statuses</option>
              {activeTab === "commissions" ? (
                <>
                  <option value="SETTLED">Settled</option>
                  <option value="PENDING">Pending Settlement</option>
                  <option value="PAID">Paid</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending Review</option>
                  <option value="processing">Processing</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </>
              )}
            </select>
          )}
        </div>
      )}

      {activeTab === "commissions" && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted gap-3">
              <FiLoader className="animate-spin" size={20} />
              <span className="text-sm">Loading accounts commission records...</span>
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-text-muted">No commission records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th className="text-left text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Ref / PO #</th>
                    <th className="text-left text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Franchisee &amp; Contact</th>
                    <th className="text-left text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Beneficiary Bank Details</th>
                    <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Order / Kits</th>
                    <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Gross Comm.</th>
                    <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">5% TDS</th>
                    <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider font-bold">Net Payout</th>
                    <th className="text-center text-text-muted font-medium px-4 py-3.5 text-xs uppercase tracking-wider">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence>
                    {filteredCommissions.map((c) => {
                      const poNumber = c.po_number || c.order_number || shortId(c.id || c._id);
                      const isPo = c.type === "FPO_PO_ORDER" || c.source === "po_order" || String(poNumber).startsWith("FPO");
                      const partnerName = c.franchisee_name || c.franchisee?.name || c.franchise_partner_name || "Franchisee Partner";
                      const partnerContact = c.partner_name || c.franchisee?.contact_person || "";
                      const contactInfo = c.email || c.mobile || c.franchisee?.email || c.franchisee?.mobile || "—";
                      const bank = c.bank_details || c.franchisee?.bank_details;
                      const orderSubtotal = c.order_subtotal ?? c.eligible_subtotal_inr ?? c.subtotal_amount ?? 0;
                      const kitQty = c.kit_qty ?? c.eligible_kit_quantity ?? 0;
                      const ratePct = c.commission_rate_pct ?? c.commission_rate ?? 0;
                      const grossComm = c.gross_commission ?? c.gross_commission_inr ?? 0;
                      const tdsAmount = c.tds_amount ?? c.tds_deducted_inr ?? 0;
                      const netPayout = c.net_commission ?? c.net_payout_inr ?? c.commission_amount ?? 0;
                      const statusVal = c.status || c.settlement_status || c.commission_status || "PENDING";
                      const utrVal = c.payout_utr || c.utr_number || c.payment_reference;
                      const settleDate = c.settlement_date || c.settled_at || c.paid_date;

                      return (
                        <motion.tr
                          key={c.id || c._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-surface-hover transition-colors"
                        >
                          {/* Reference / PO */}
                          <td className="px-5 py-4">
                            <div className="font-mono text-xs font-bold text-primary flex items-center gap-1.5">
                              {poNumber}
                              <button
                                onClick={() => copyToClipboard(poNumber, c.id || c._id)}
                                className="text-text-muted hover:text-text-primary p-0.5"
                                title="Copy PO Ref"
                              >
                                {copiedId === (c.id || c._id) ? <FiCheck className="text-success" size={12} /> : <FiCopy size={12} />}
                              </button>
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">{fmtDate(c.created_at)}</div>
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-bg text-text-secondary border border-border">
                              {isPo ? "PO Bulk Kit" : "Loose Order"}
                            </span>
                          </td>

                          {/* Franchisee */}
                          <td className="px-5 py-4">
                            <div className="font-semibold text-text-primary text-sm">{partnerName}</div>
                            {partnerContact && (
                              <div className="text-xs text-text-secondary">Partner: {partnerContact}</div>
                            )}
                            <div className="text-[11px] text-text-muted">{contactInfo}</div>
                          </td>

                          {/* Bank Details */}
                          <td className="px-5 py-4 font-mono text-xs">
                            {bank?.account_number ? (
                              <div className="p-2 rounded-xl bg-bg border border-border space-y-0.5">
                                <div className="font-bold text-text-primary text-[11px]">{bank.bank_name || "Bank Account"}</div>
                                <div className="text-text-secondary text-[11px]">
                                  A/C: <span className="font-semibold">{bank.account_number}</span>
                                </div>
                                <div className="text-text-muted text-[10px]">
                                  IFSC: {bank.ifsc_code} · {bank.account_holder_name}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted italic">Bank details pending update</span>
                            )}
                          </td>

                          {/* Order Subtotal & Kits */}
                          <td className="px-5 py-4 text-right">
                            <div className="font-semibold text-text-primary text-xs">{fmt(orderSubtotal)}</div>
                            <div className="text-[11px] text-text-muted">{kitQty} Kits · {ratePct}% Rate</div>
                          </td>

                          {/* Gross Commission */}
                          <td className="px-5 py-4 text-right font-bold text-emerald-600">
                            {fmt(grossComm)}
                          </td>

                          {/* 5% TDS */}
                          <td className="px-5 py-4 text-right font-semibold text-rose-500 text-xs">
                            -{fmt(tdsAmount)}
                            <div className="text-[10px] text-text-muted font-normal">Sec 194H (5%)</div>
                          </td>

                          {/* Net Commission */}
                          <td className="px-5 py-4 text-right font-extrabold text-primary text-sm">
                            {fmt(netPayout)}
                          </td>

                          {/* Settlement Status */}
                          <td className="px-4 py-4 text-center">
                            <CommissionStatusBadge status={statusVal} />
                            {settleDate && (
                              <div className="text-[10px] text-text-muted mt-1">{fmtDate(settleDate)}</div>
                            )}
                            {utrVal && utrVal !== "N/A" && (
                              <div className="font-mono text-[9px] text-text-secondary mt-0.5 truncate max-w-[120px] mx-auto" title={utrVal}>
                                UTR: {utrVal}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "wallets" && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  {["Reseller Partner", "Gross Earned", "5% TDS", "Net Earned", "Available Balance", "Pending Holds", "Withdrawn", "Status"].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-medium text-text-muted uppercase tracking-wider ${h === "Reseller Partner" ? "text-left" : "text-right"} ${["Gross Earned","5% TDS"].includes(h) ? "hidden xl:table-cell" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wallets.map((w) => (
                  <tr key={w.id || w._id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-text-primary">{w.reseller_id?.business_name || "Franchisee Partner"}</div>
                      <div className="text-xs text-text-muted">{w.reseller_id?.email}</div>
                      {w.reseller_id?.pan_number && <div className="text-[11px] font-mono text-text-muted">PAN: {w.reseller_id.pan_number}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-text-primary hidden xl:table-cell">{fmt(w.breakdown?.gross_earned_inr || 0)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-danger hidden xl:table-cell">{fmt(w.breakdown?.tds_deducted_inr || 0)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-text-primary">{fmt(w.breakdown?.net_earned_inr || w.total_earned || 0)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-success text-base">{fmt(w.available_balance || 0)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-warning">{fmt(w.pending_balance || 0)}</td>
                    <td className="px-5 py-3.5 text-right text-text-muted">{fmt(w.total_withdrawn || 0)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${w.status === "frozen" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
                        {w.status || "active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ledgers" && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          {filteredLedgers.length === 0 ? (
            <div className="py-20 text-center text-text-muted text-sm">
              No ledger entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg text-text-muted text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3.5 font-medium">Timestamp</th>
                    <th className="text-left px-5 py-3.5 font-medium">Franchisee / Reseller</th>
                    <th className="text-left px-5 py-3.5 font-medium">Category &amp; Description</th>
                    <th className="text-right px-5 py-3.5 font-medium">Entry Type</th>
                    <th className="text-right px-5 py-3.5 font-medium">Amount</th>
                    <th className="text-right px-5 py-3.5 font-medium">Balance After</th>
                    <th className="text-right px-5 py-3.5 font-medium">Reference ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLedgers.map((l) => {
                    const isCredit = l.entry_type === "credit";
                    const amountInr = (l.amount_paise || 0) / 100;
                    const balanceInr = (l.balance_after_paise || 0) / 100;
                    return (
                      <tr key={l._id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3.5 text-xs text-text-muted whitespace-nowrap">
                          {fmtDate(l.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-text-primary text-xs">
                            {l.reseller_id?.business_name || "Franchisee"}
                          </div>
                          <div className="text-[11px] text-text-muted">{l.reseller_id?.email || ""}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg border border-border">
                              {l.category}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">{l.description}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            }`}
                          >
                            {isCredit ? <FiArrowDownLeft size={12} /> : <FiArrowUpRight size={12} />}
                            {l.entry_type}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-right font-bold ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                          {isCredit ? "+" : "-"}{fmt(amountInr)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-text-primary font-semibold">
                          {fmt(balanceInr)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-text-muted">
                          {l.reference_id ? shortId(l.reference_id) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "payouts" && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-text-muted gap-3">
                <FiLoader className="animate-spin" size={20} />
                <span className="text-sm">Loading payout requests...</span>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-sm text-text-muted">No payout requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      <th className="text-left text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Request</th>
                      <th className="text-left text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Reseller</th>
                      <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Amount</th>
                      <th className="text-left text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider hidden md:table-cell">Bank Details</th>
                      <th className="text-center text-text-muted font-medium px-4 py-3.5 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider hidden lg:table-cell">UTR / Ref</th>
                      <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                      <th className="text-right text-text-muted font-medium px-5 py-3.5 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border">
                    <AnimatePresence>
                      {filteredPayouts.map((p) => (
                        <motion.tr
                          key={p.id || p._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-surface-hover transition-colors"
                        >
                          <td className="px-5 py-3.5 font-mono text-[11px] text-text-muted">
                            {shortId(p.id || p._id)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-text-primary text-sm">{p.reseller_id?.business_name || p.reseller?.business_name}</div>
                            <div className="text-xs text-text-muted">{p.reseller_id?.email || p.reseller?.email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-primary">
                            {fmt(p.amount_paise ? p.amount_paise / 100 : p.amount)}
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell font-mono text-xs text-text-secondary">
                            {p.bank_details_snapshot ? (
                              <div>
                                <div className="font-semibold">{p.bank_details_snapshot.bank_name}</div>
                                <div className="text-text-muted">A/C: {p.bank_details_snapshot.account_number}</div>
                              </div>
                            ) : (
                              <span className="italic text-text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-xs text-text-secondary hidden lg:table-cell">
                            {p.utr_reference || p.transaction_reference || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs text-text-muted hidden lg:table-cell whitespace-nowrap">
                            {fmtDate(p.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {p.status === "pending" && (
                                <button
                                  onClick={() => setSelectedPayout(p)}
                                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-all shadow-sm"
                                >
                                  Process
                                </button>
                              )}
                              {p.status === "processing" && (
                                <button
                                  onClick={() => setFailedPayout(p)}
                                  className="px-3 py-1.5 rounded-xl bg-danger text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
                                >
                                  Mark Failed
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <FiShield className="text-primary" size={18} />
              Razorpay Webhook Event Audit Logs
            </h3>
            <button onClick={fetchWebhooks} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-bg-card-hover">
              <FiRefreshCw size={12} /> Refresh
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              No webhook events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg text-text-muted">
                    <th className="text-left px-4 py-3 font-semibold">Event ID &amp; Timestamp</th>
                    <th className="text-left px-4 py-3 font-semibold">Event Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Order / Payment Reference</th>
                    <th className="text-center px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {webhooks.map((wh) => (
                    <tr key={wh._id || wh.event_id} className="hover:bg-surface-hover transition-colors font-mono">
                      <td className="px-4 py-3">
                        <div className="font-bold text-text-primary">{wh.event_id}</div>
                        <div className="text-[10px] text-text-muted">{fmtDate(wh.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-primary">{wh.event_type}</td>
                      <td className="px-4 py-3 text-text-secondary">{wh.order_id || wh.payment_id || "N/A"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${wh.status === "processed" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                          {wh.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {selectedPayout && (
        <ProcessPayoutModal
          payout={selectedPayout}
          onClose={() => setSelectedPayout(null)}
          onProcessed={refreshAll}
        />
      )}
      {failedPayout && (
        <MarkFailedModal
          payout={failedPayout}
          onClose={() => setFailedPayout(null)}
          onProcessed={refreshAll}
        />
      )}
    </div>
  );
}
