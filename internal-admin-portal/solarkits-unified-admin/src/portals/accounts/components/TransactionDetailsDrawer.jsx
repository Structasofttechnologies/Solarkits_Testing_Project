/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdClose,
  MdCheckCircle,
  MdPending,
  MdErrorOutline,
  MdContentCopy,
  MdReceipt,
  MdPerson,
  MdStorefront,
  MdAttachMoney,
  MdAccountBalance,
  MdCreditCard,
  MdLocalShipping,
  MdDoneAll,
  MdOutlineAccessTime
} from "react-icons/md";
import { FaRupeeSign, FaShieldAlt, FaSolarPanel, FaBolt, FaBoxOpen, FaTools, FaShoppingCart } from "react-icons/fa";
import { getTransactionDetails, verifyEpcOrderPayment, dispatchEpcOrder } from "../api/solarshopAccounts";
import Button from "./Button";

export default function TransactionDetailsDrawer({ isOpen, onClose, transaction, onStatusUpdated }) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Accounts Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [actionErrorMsg, setActionErrorMsg] = useState("");

  // Dispatch Tracking State
  const [showDispatchSection, setShowDispatchSection] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  useEffect(() => {
    if (isOpen && transaction) {
      fetchFullDetails();
      setActionSuccessMsg("");
      setActionErrorMsg("");
      setShowRejectModal(false);
    } else {
      setDetails(null);
    }
  }, [isOpen, transaction]);

  const handleApprovePayment = async (targetMilestoneNum = null) => {
    const isM1 = targetMilestoneNum === 1;
    const isM2 = targetMilestoneNum === 2;
    const confirmPrompt = isM1
      ? "Confirm that Advance Payment (Milestone 1) UTR and funds have been verified in company bank statement? This will generate the Proforma Invoice (PI) and confirm the order for processing."
      : isM2
      ? "Confirm that Final Balance Payment (Milestone 2) UTR and funds have been verified in company bank statement? This will mark payment as captured, generate the official Tax Invoice, and stage the order for dispatch."
      : "Confirm that bank transfer UTR and funds have been verified in company bank statement? This will automatically generate the official Tax Invoice.";

    if (!window.confirm(confirmPrompt)) return;

    setActionLoading(true);
    setActionSuccessMsg("");
    setActionErrorMsg("");
    try {
      const orderId = details?.id || details?._id || transaction?.id || transaction?._id;
      const payload = { decision: "approved" };
      if (targetMilestoneNum) payload.milestone_number = targetMilestoneNum;
      const res = await verifyEpcOrderPayment(orderId, payload);
      if (res.status === "success") {
        setActionSuccessMsg(res.message || "Payment approved successfully!");
        fetchFullDetails();
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err) {
      setActionErrorMsg(err.response?.data?.message || err.message || "Failed to approve payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionErrorMsg("Please enter a specific rejection reason for the EPC contractor.");
      return;
    }

    setActionLoading(true);
    setActionSuccessMsg("");
    setActionErrorMsg("");
    try {
      const orderId = details?.id || details?._id || transaction?.id || transaction?._id;
      const res = await verifyEpcOrderPayment(orderId, {
        decision: "rejected",
        rejection_reason: rejectionReason.trim(),
      });
      if (res.status === "success") {
        setActionSuccessMsg(res.message || "Payment rejected. EPC notified with rejection reason.");
        setShowRejectModal(false);
        setRejectionReason("");
        fetchFullDetails();
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err) {
      setActionErrorMsg(err.response?.data?.message || err.message || "Failed to reject payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDispatch = async (e) => {
    e.preventDefault();
    if (!courierName || !trackingNumber) {
      setActionErrorMsg("Courier name and tracking/LR number are required.");
      return;
    }

    setActionLoading(true);
    try {
      const orderId = details?.id || details?._id || transaction?.id || transaction?._id;
      const res = await dispatchEpcOrder(orderId, {
        courier_name: courierName,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
      });
      if (res.status === "success") {
        setActionSuccessMsg("Dispatch and tracking information updated successfully.");
        setShowDispatchSection(false);
        fetchFullDetails();
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err) {
      setActionErrorMsg(err.response?.data?.message || "Failed to save dispatch details.");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchFullDetails = async () => {
    if (!transaction) return;
    setLoading(true);
    try {
      const type = transaction.type_key || (transaction.transaction_type?.toLowerCase().includes('plan') ? 'franchise_plan' : 'order');
      const res = await getTransactionDetails(type, transaction.id || transaction._id);
      if (res.status === 'success') {
        setDetails(res.data);
      }
    } catch (err) {
      console.error("Error fetching full transaction details:", err);
      // Fallback to transaction prop object
      setDetails(transaction);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status, type = 'payment') => {
    const s = String(status || '').toLowerCase();
    if (s === 'paid' || s === 'captured' || s === 'success' || s === 'active' || s === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <MdCheckCircle className="text-emerald-500 text-sm" />
          {status || 'Paid'}
        </span>
      );
    }
    if (s === 'pending' || s === 'grace' || s === 'confirmed' || s === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <MdPending className="text-amber-500 text-sm" />
          {status || 'Pending'}
        </span>
      );
    }
    if (s === 'on hold' || s === 'on_hold') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20">
          <MdOutlineAccessTime className="text-orange-500 text-sm" />
          On Hold
        </span>
      );
    }
    if (s === 'failed' || s === 'expired' || s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
          <MdErrorOutline className="text-red-500 text-sm" />
          {status || 'Failed'}
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
          <MdReceipt className="text-purple-500 text-sm" />
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {status || 'N/A'}
      </span>
    );
  };

  const isPlan = details?.type_key === 'franchise_plan' || transaction?.type_key === 'franchise_plan' || transaction?.transaction_type === 'Franchise Plan';
  const isDirectEpc = details?.type_key === 'direct_epc' || transaction?.type_key === 'direct_epc' || details?.is_direct;
  const isCommission = !isPlan && !isDirectEpc;

  const txnId = details?.transaction_id || transaction?.transaction_id || transaction?.order_number || 'N/A';
  const txnType = details?.transaction_type || transaction?.transaction_type || 'Transaction';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Side Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 max-w-full w-full sm:max-w-xl md:max-w-2xl bg-surface border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 bg-surface border-b border-border flex items-center justify-between sticky top-0 z-10">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    isPlan
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      : isDirectEpc
                      ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  }`}>
                    {txnType}
                  </span>
                  {renderStatusBadge(
                    details?.payment_info?.payment_status || details?.payment_status || transaction?.payment_status
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
                    {txnId}
                  </h2>
                  <button
                    onClick={() => copyToClipboard(txnId, 'txnId')}
                    className="text-text-muted hover:text-primary transition-colors p-1 rounded hover:bg-surface-hover"
                    title="Copy Transaction ID"
                  >
                    {copiedField === 'txnId' ? (
                      <span className="text-[10px] font-semibold text-emerald-600">Copied!</span>
                    ) : (
                      <MdContentCopy size={15} />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hover">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm font-medium text-text-muted">Loading complete transaction breakdown...</p>
                </div>
              ) : (
                <>
                  {/* Financial Summary Highlight Card */}
                  <div className="p-5 rounded-2xl bg-linear-135 from-primary/5 via-surface to-primary/10 border border-primary/20 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Total Amount Paid by EPC (Incl. GST & Delivery)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono tracking-tight">
                        {formatCurrency(
                          details?.financial_breakdown?.total_amount != null
                            ? details.financial_breakdown.total_amount
                            : details?.total_amount != null
                            ? details.total_amount
                            : transaction?.total_transaction_amount || transaction?.total_amount || transaction?.plan_amount || 0
                        )}
                      </span>
                      <span className="text-xs font-semibold text-text-muted">INR</span>
                    </div>

                    {/* Split details — correct financial formula */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60">
                      {/* 1. Base Subtotal (excl. all charges) */}
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Base Subtotal</span>
                        <span className="text-sm font-bold text-text-primary">
                          {formatCurrency(
                            details?.financial_breakdown?.base_subtotal != null
                              ? details.financial_breakdown.base_subtotal
                              : details?.financial_breakdown?.epc_amount != null
                              ? details.financial_breakdown.epc_amount
                              : details?.base_subtotal ?? details?.epc_amount ?? transaction?.epc_amount ?? 0
                          )}
                        </span>
                        <span className="text-[10px] text-text-muted block mt-0.5">Excl. GST & Delivery</span>
                      </div>

                      {/* 2. GST / Tax */}
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase block">GST / Tax</span>
                        <span className="text-sm font-bold text-amber-600">
                          {formatCurrency(
                            details?.financial_breakdown?.tax_amount != null
                              ? details.financial_breakdown.tax_amount
                              : details?.tax_amount ?? transaction?.tax_amount ?? 0
                          )}
                        </span>
                        <span className="text-[10px] text-amber-600/80 block mt-0.5">GST @ 13.8%</span>
                      </div>

                      {/* 3. Delivery Charges (Direct EPC) OR Franchise Commission (onboarded) */}
                      {!isPlan && (
                        <div>
                          {isDirectEpc ? (
                            <>
                              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase block">Delivery Charges</span>
                              <span className="text-sm font-bold text-sky-600">
                                {formatCurrency(
                                  details?.financial_breakdown?.delivery_charge != null
                                    ? details.financial_breakdown.delivery_charge
                                    : details?.delivery_amount ?? transaction?.delivery_amount ?? 0
                                )}
                              </span>
                              <span className="text-[10px] text-sky-600/80 block mt-0.5">Logistics / Shipping</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Franchise Comm.</span>
                              <span className="text-sm font-bold text-emerald-600">
                                {formatCurrency(
                                  details?.financial_breakdown?.franchise_commission != null
                                    ? details.financial_breakdown.franchise_commission
                                    : details?.franchise_commission ?? transaction?.franchise_commission ?? 0
                                )}
                              </span>
                              <span className="text-[10px] text-text-muted block mt-0.5">Partner Share</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* 4. Company Net Received */}
                      <div>
                        <span className="text-[10px] font-bold text-primary uppercase block">Company Net Received</span>
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(
                            details?.financial_breakdown?.company_amount != null
                              ? details.financial_breakdown.company_amount
                              : details?.company_amount ?? transaction?.company_amount ?? 0
                          )}
                        </span>
                        <span className="text-[10px] text-primary/80 block mt-0.5">
                          {isDirectEpc ? 'Grand Total (No Commission)' : 'After Partner Comm.'}
                        </span>
                      </div>
                    </div>

                    {/* Formula annotation for full transparency */}
                    {!isPlan && (
                      <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-text-muted font-mono flex flex-wrap items-center gap-1">
                        <span className="text-text-muted/60">Ledger:</span>
                        <span>Base Subtotal</span>
                        <span className="text-amber-500">+ GST</span>
                        {isDirectEpc && <span className="text-sky-500">+ Delivery</span>}
                        {!isDirectEpc && <span className="text-emerald-500">− Franchise Comm.</span>}
                        <span>=</span>
                        <span className="font-bold text-primary">
                          {isDirectEpc ? 'Total Paid = Company Net' : 'Company Net Received'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Context Cards: Franchise Partner & EPC Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Franchise Partner Details */}
                    {(details?.franchise_details || isPlan || transaction?.franchise_partner_name || transaction?.party_name) && !isDirectEpc && (
                      <div className="p-4 rounded-xl bg-surface-hover/30 border border-border space-y-2.5">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider pb-1 border-b border-border/50">
                          <MdStorefront size={16} />
                          Franchise Partner
                        </div>
                        <div>
                          <p className="text-xs text-text-muted font-medium">Business Name</p>
                          <p className="text-sm font-bold text-text-primary">
                            {details?.franchise_details?.business_name || transaction?.franchise_partner_name || transaction?.party_name || 'N/A'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted block">Contact Person</span>
                            <span className="font-semibold text-text-primary">
                              {details?.franchise_details?.contact_person || transaction?.contact_person || 'Partner Admin'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">Mobile</span>
                            <span className="font-semibold text-text-primary">
                              {details?.franchise_details?.mobile || transaction?.mobile || transaction?.partner_mobile || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">GSTIN</span>
                            <span className="font-mono font-semibold text-text-primary">
                              {details?.franchise_details?.gst_number || transaction?.gst_number || transaction?.partner_gstin || 'N/A'}
                            </span>
                          </div>
                          {isPlan && (
                            <div>
                              <span className="text-text-muted block">Territory Tier</span>
                              <span className="font-semibold text-primary">
                                {details?.plan_details?.territory || transaction?.territory || 'District Level'}
                              </span>
                            </div>
                          )}
                          {/* Payout Bank Details */}
                          {(details?.bank_details || transaction?.bank_details) && (
                            <div className="col-span-2 mt-2 pt-2 border-t border-border/60 bg-emerald-500/10 p-2.5 rounded-xl text-xs">
                              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                                Beneficiary Payout Bank Details
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <span className="text-text-muted text-[10px] block">Bank Name</span>
                                  <span className="font-bold text-text-primary">
                                    {details?.bank_details?.bank_name || transaction?.bank_details?.bank_name}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-text-muted text-[10px] block">A/C Number</span>
                                  <span className="font-mono font-bold text-text-primary">
                                    {details?.bank_details?.account_number || transaction?.bank_details?.account_number}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-text-muted text-[10px] block">IFSC Code</span>
                                  <span className="font-mono font-bold text-text-primary">
                                    {details?.bank_details?.ifsc_code || transaction?.bank_details?.ifsc_code}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-text-muted text-[10px] block">A/C Holder</span>
                                  <span className="font-semibold text-text-primary truncate block">
                                    {details?.bank_details?.account_holder_name || transaction?.bank_details?.account_holder_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* EPC Contractor Details (For Direct EPC or Onboarded Orders) */}
                    {(details?.epc_details || !isPlan || transaction?.epc_name) && (
                      <div className="p-4 rounded-xl bg-surface-hover/30 border border-border space-y-2.5">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider pb-1 border-b border-border/50">
                          <MdPerson size={16} />
                          EPC Contractor Details
                        </div>
                        <div>
                          <p className="text-xs text-text-muted font-medium">EPC Entity Name</p>
                          <p className="text-sm font-bold text-text-primary">
                            {details?.epc_details?.name || transaction?.epc_name || transaction?.party_name || 'Direct EPC'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted block">Email</span>
                            <span className="font-semibold text-text-primary truncate block">
                              {details?.epc_details?.email || transaction?.epc_email || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">WhatsApp / Phone</span>
                            <span className="font-semibold text-text-primary">
                              {details?.epc_details?.whatsapp || transaction?.epc_phone || transaction?.epc_mobile || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">GSTIN</span>
                            <span className="font-mono font-semibold text-text-primary">
                              {details?.epc_details?.gstin || transaction?.epc_gstin || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">Onboarding Type</span>
                            <span className="font-semibold capitalize text-text-primary">
                              {details?.epc_details?.onboarding_source || (isDirectEpc ? 'Direct' : 'Via Franchisee')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery & Installation Site Address Card */}
                    {(!isPlan && (details?.delivery_address || details?.payment_info?.delivery_address || transaction?.delivery_address)) && (
                      <div className="p-4 rounded-xl bg-surface-hover/30 border border-border space-y-2.5">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider pb-1 border-b border-border/50">
                          <MdLocalShipping size={16} />
                          Delivery & Site Address
                        </div>
                        <div>
                          <p className="text-xs text-text-muted font-medium">Site Street Address</p>
                          <p className="text-sm font-semibold text-text-primary">
                            {details?.delivery_address?.line || details?.payment_info?.delivery_address?.line || transaction?.delivery_address?.line || 'Registered Site Address'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted block">District & State</span>
                            <span className="font-semibold text-text-primary">
                              {[
                                details?.delivery_address?.district_name || details?.payment_info?.delivery_address?.district_name || transaction?.delivery_address?.district_name,
                                details?.delivery_address?.state_name || details?.payment_info?.delivery_address?.state_name || transaction?.delivery_address?.state_name
                              ].filter(Boolean).join(', ') || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">PIN Code</span>
                            <span className="font-mono font-bold text-primary">
                              {details?.delivery_address?.pincode || details?.payment_info?.delivery_address?.pincode || transaction?.delivery_address?.pincode || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">Site Contact Person</span>
                            <span className="font-semibold text-text-primary">
                              {details?.delivery_address?.contact_name || details?.payment_info?.delivery_address?.contact_name || transaction?.delivery_address?.contact_name || details?.epc_details?.name || 'Site Manager'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">Contact Phone</span>
                            <span className="font-semibold text-text-primary font-mono">
                              {details?.delivery_address?.contact_phone || details?.payment_info?.delivery_address?.contact_phone || transaction?.delivery_address?.contact_phone || details?.epc_details?.whatsapp || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plan / Product Line Items Breakdown Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <MdReceipt size={16} className="text-primary" />
                      {isPlan ? 'Plan Subscription Specifications' : 'Order Items Breakdown'}
                    </h3>

                    {isPlan ? (
                      <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-border/50">
                          <span className="text-text-muted font-medium">Plan Name</span>
                          <span className="font-bold text-text-primary">{details?.plan_details?.name || transaction?.plan_name}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-border/50">
                          <span className="text-text-muted font-medium">Validity Period</span>
                          <span className="font-semibold text-text-primary">{details?.plan_details?.validity || transaction?.validity || '1 Year'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-border/50">
                          <span className="text-text-muted font-medium">Territory Scope</span>
                          <span className="font-semibold text-primary">{details?.plan_details?.territory || transaction?.territory}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-text-muted font-medium">One-Time Fee</span>
                          <span className="font-bold text-text-primary">
                            {formatCurrency(details?.financial_breakdown?.total_amount || transaction?.plan_amount)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Detailed Equipment & Component Bill of Materials (BOM) Cards */}
                        {(details?.items || transaction?.items || []).map((item, idx) => {
                          const breakdown = item.combo_kit_breakdown;
                          const hasBOM = Boolean(breakdown && (breakdown.base_components?.length > 0 || breakdown.bos_kits?.length > 0));

                          return (
                            <div key={idx} className="border border-border rounded-2xl overflow-hidden bg-surface shadow-xs space-y-3 p-4">
                              {/* Primary Kit / Equipment Header */}
                              <div className="flex items-start gap-3.5 pb-3 border-b border-border/60">
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-border bg-surface shadow-xs flex items-center justify-center">
                                  {item.image || breakdown?.kit_image ? (
                                    <img
                                      src={item.image || breakdown?.kit_image}
                                      alt={item.item_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className="w-full h-full flex items-center justify-center bg-primary/10 text-primary"
                                    style={{ display: (item.image || breakdown?.kit_image) ? "none" : "flex" }}
                                  >
                                    <FaBoxOpen size={24} />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <h4 className="font-extrabold text-sm text-text-primary leading-snug">
                                    {item.item_name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(item.capacity || breakdown?.capacity) && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                        ⚡ {item.capacity || breakdown?.capacity}
                                      </span>
                                    )}
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                                      Scope: {item.scope_type || 'Kit'}
                                    </span>
                                    <span className="text-xs text-text-secondary">
                                      Ordered: <strong className="text-text-primary font-bold">{item.quantity} Kit(s)</strong>
                                    </span>
                                    {breakdown?.system_type && (
                                      <span className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">
                                        {breakdown.system_type === 'on_grid' ? 'On-Grid' : breakdown.system_type}
                                      </span>
                                    )}
                                  </div>
                                  {(item.description || breakdown?.description) && (
                                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mt-1">
                                      {item.description || breakdown?.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Technical Bill of Materials (BOM) Breakdown: Panels, Inverter & BOS Kits */}
                              {hasBOM && (
                                <div className="space-y-3 pt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                                      <FaTools className="text-primary" size={13} />
                                      Included System Components & Hardware Bill of Materials (BOM)
                                    </span>
                                    <span className="text-[10px] text-text-muted font-mono">
                                      Per Kit & Total Dispatch Quantity
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* 1. Solar Panels (PV Modules) */}
                                    {breakdown.panel_component && (
                                      <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                            <FaSolarPanel className="text-amber-500" size={15} />
                                            Solar Panels (PV Modules)
                                          </span>
                                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                                            {breakdown.panel_component.quantity_per_kit} panels / kit
                                          </span>
                                        </div>
                                        <div className="text-xs text-text-primary font-semibold">
                                          {breakdown.panel_component.sku || 'High-Efficiency Mono PERC Solar Panels'}
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] text-text-muted pt-1.5 border-t border-border/50">
                                          <span>Brand: <strong className="text-text-primary">{breakdown.panel_component.brand || 'Tata Power Solar'}</strong></span>
                                          <span className="font-bold text-primary font-mono text-xs">
                                            Total: {breakdown.panel_component.total_quantity || breakdown.panel_component.quantity_per_kit * item.quantity} Panels
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 2. Solar Inverter */}
                                    {breakdown.inverter_component && (
                                      <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                            <FaBolt className="text-primary" size={15} />
                                            Solar Inverter
                                          </span>
                                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                            {breakdown.inverter_component.quantity_per_kit} unit / kit
                                          </span>
                                        </div>
                                        <div className="text-xs text-text-primary font-semibold">
                                          {breakdown.inverter_component.sku || 'Single-Phase String Inverter'}
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] text-text-muted pt-1.5 border-t border-border/50">
                                          <span>Mode: <strong className="text-text-primary">{breakdown.inverter_mode === 'single' ? 'Single-Phase String' : '3-Phase String'}</strong></span>
                                          <span className="font-bold text-primary font-mono text-xs">
                                            Total: {breakdown.inverter_component.total_quantity || breakdown.inverter_component.quantity_per_kit * item.quantity} Units
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* 3. Balance of System (BOS) Protection & Mounting Bundles */}
                                  {breakdown.bos_kits?.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                        Balance of System (BOS) Bundles & Electrical Protection:
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {breakdown.bos_kits.map((bk, bIdx) => (
                                          <div key={bIdx} className="p-2.5 rounded-xl bg-surface-hover/40 border border-border flex items-center gap-2.5">
                                            {bk.image ? (
                                              <img
                                                src={bk.image}
                                                alt={bk.name}
                                                className="w-12 h-12 rounded-lg object-cover border border-border bg-surface shrink-0"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                              />
                                            ) : (
                                              <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center text-primary shrink-0">
                                                <FaBoxOpen size={18} />
                                              </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-text-primary truncate" title={bk.name}>
                                                {bk.name}
                                              </p>
                                              <div className="flex justify-between items-center text-[10px] text-text-muted mt-0.5">
                                                <span>{bk.quantity_per_kit} bundle/kit</span>
                                                <strong className="text-text-primary font-mono font-bold">
                                                  Total: {bk.total_quantity || bk.quantity_per_kit * item.quantity} Bundles
                                                </strong>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Commercial Financial Summary Line Items Table */}
                        <div className="border border-border rounded-xl overflow-hidden bg-surface">
                          <div className="px-3.5 py-2.5 bg-surface-hover/60 border-b border-border text-[11px] font-bold uppercase text-text-secondary flex items-center justify-between">
                            <span>Commercial Billing Line Items</span>
                            <span className="text-[10px] text-text-muted font-normal">Official Order Ledger</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface-hover/30 text-text-muted font-semibold border-b border-border">
                                <tr>
                                  <th className="px-3 py-2.5">Item Name</th>
                                  <th className="px-3 py-2.5 text-center">Qty</th>
                                  <th className="px-3 py-2.5 text-right">Unit Price</th>
                                  {!isDirectEpc && <th className="px-3 py-2.5 text-right">Margin / Comm</th>}
                                  <th className="px-3 py-2.5 text-right">Total Price</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {(details?.items || transaction?.items || []).map((item, idx) => (
                                  <tr key={idx} className="hover:bg-surface-hover/30 transition-colors">
                                    <td className="px-3 py-2.5 font-medium text-text-primary max-w-[200px] truncate" title={item.item_name}>
                                      {item.item_name}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-bold text-text-secondary">{item.quantity}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                                    {!isDirectEpc && (
                                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-600">
                                        {formatCurrency(item.reseller_margin)}
                                      </td>
                                    )}
                                    <td className="px-3 py-2.5 text-right font-mono font-bold text-text-primary">
                                      {formatCurrency(item.total_price)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                                    {/* Linked Repeat Orders & Drawdowns (For Master PO) */}
                  {(() => {
                    const drawdowns = details?.linked_repeat_orders || transaction?.linked_repeat_orders || [];
                    if (!drawdowns || drawdowns.length === 0) return null;
                    return (
                      <div className="p-4 rounded-xl bg-surface border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-border/50">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <FaShoppingCart className="text-primary" />
                            Drawdowns Placed Under PO ({drawdowns.length})
                          </h3>
                          <span className="text-[10px] text-text-muted font-mono">
                            {details?.fulfilled_quantity || transaction?.fulfilled_quantity || 0} of {details?.total_booked_quantity || transaction?.total_booked_quantity || 0} Kits Fulfilled
                          </span>
                        </div>
                        <div className="border border-border/50 rounded-lg overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-surface-hover/30 text-text-muted font-semibold border-b border-border">
                              <tr>
                                <th className="px-3 py-2">Order #</th>
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2 text-center">Kits</th>
                                <th className="px-3 py-2 text-right">Net Paid</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {drawdowns.map((d, dIdx) => (
                                <tr key={dIdx} className="hover:bg-surface-hover/30 transition-colors">
                                  <td className="px-3 py-2 font-mono font-bold text-primary">{d.order_number || d.po_number}</td>
                                  <td className="px-3 py-2 text-text-muted">{d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</td>
                                  <td className="px-3 py-2 text-center font-bold text-blue-600">{d.kits}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(d.net_paid)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {d.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Milestone Plan Card (If Configured) */}
                  {(() => {
                    const pm = details?.payment_milestones || details?.payment_info?.payment_milestones || transaction?.payment_milestones;
                    if (!pm) return null;
                    const mList = pm.milestones || [];
                    const m1 = mList.find(m => m.milestone_number === 1) || {};
                    const m2 = mList.find(m => m.milestone_number === 2) || {};
                    const m1Done = m1.payment_status === 'verified' || ['advance_verified', 'fully_paid'].includes(pm.milestone_verification_status);
                    const m2Done = m2.payment_status === 'verified' || pm.milestone_verification_status === 'fully_paid';
                    const m2Submitted = m2.payment_status === 'pending_verification' || pm.milestone_verification_status === 'final_payment_pending_verification' || Boolean(m2.utr_number);

                    const m1Required = pm.advance_amount || m1.amount || (details?.financial_breakdown?.total_amount ? Math.round(details.financial_breakdown.total_amount * 0.3) : 0);
                    const m1Paid = m1.amount_paid != null ? m1.amount_paid : (details?.offline_payment?.amount_paid != null ? details.offline_payment.amount_paid : null);

                    const m2Pct = pm.remaining_percentage || pm.balance_percentage || m2.percentage || 70;
                    const m2Required = pm.remaining_amount || pm.balance_amount || m2.amount || (details?.financial_breakdown?.total_amount ? Math.round(details.financial_breakdown.total_amount * 0.7) : 0);
                    const m2Paid = m2.amount_paid != null ? m2.amount_paid : 0;

                    return (
                      <div className="p-4 rounded-xl bg-surface border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-border/50">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <FaBolt className="text-amber-500" />
                            Configured Payment Milestones
                          </h3>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {pm.is_default ? 'Default Milestone Plan' : 'Product Milestone Plan'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Milestone 1 */}
                          <div className={`p-3 rounded-xl border ${m1Done ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'} space-y-1.5`}>
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-text-primary text-[11px]">
                                Milestone 1 ({pm.advance_percentage || 30}% Advance)
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                m1Done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600 animate-pulse'
                              }`}>
                                {m1Done ? 'Verified' : 'Pending Verification'}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1 flex-wrap">
                              <div className="text-base font-black text-text-primary">
                                {formatCurrency(m1Required)}
                              </div>
                              {m1Paid != null && m1Paid > 0 && m1Paid !== m1Required && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  Paid: {formatCurrency(m1Paid)}
                                </span>
                              )}
                            </div>
                            {m1Paid != null && m1Paid > 0 && m1Paid < m1Required && (
                              <div className="text-[10px] font-bold text-rose-500">
                                Shortfall: {formatCurrency(m1Required - m1Paid)}
                              </div>
                            )}
                            <div className="text-[10px] text-text-muted">
                              Stage: Advance Payment at Order Placement
                            </div>
                            {m1.utr_number && (
                              <div className="text-[10px] font-mono text-text-secondary truncate">
                                UTR: <strong className="text-primary">{m1.utr_number}</strong>
                              </div>
                            )}
                            {m1Done && (details?.payment_info?.invoice?.invoice_number || details?.invoice?.invoice_number) && (
                              <div className="text-[10px] font-mono font-bold text-emerald-600 flex items-center gap-1">
                                <MdReceipt size={12} />
                                PI: {details?.payment_info?.invoice?.invoice_number || details?.invoice?.invoice_number}
                              </div>
                            )}
                          </div>

                          {/* Milestone 2 */}
                          <div className={`p-3 rounded-xl border ${m2Done ? 'bg-emerald-500/5 border-emerald-500/30' : m2Submitted ? 'bg-amber-500/5 border-amber-500/30' : 'bg-surface-hover/50 border-border'} space-y-1.5`}>
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-text-primary text-[11px]">
                                Milestone 2 ({m2Pct}% Balance)
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                m2Done ? 'bg-emerald-500/15 text-emerald-600' : m2Submitted ? 'bg-amber-500/15 text-amber-600 animate-pulse' : 'bg-slate-500/10 text-text-muted'
                              }`}>
                                {m2Done ? 'Verified' : m2Submitted ? 'Proof Submitted' : 'Awaiting Stage'}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1 flex-wrap">
                              <div className="text-base font-black text-text-primary">
                                {formatCurrency(m2Required)}
                              </div>
                              {m2Paid > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  Paid: {formatCurrency(m2Paid)}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              Stage: Before Dispatch
                            </div>
                            {m2.utr_number ? (
                              <div className="text-[10px] font-mono text-text-secondary truncate">
                                UTR: <strong className="text-primary">{m2.utr_number}</strong>
                              </div>
                            ) : (
                              <div className="text-[10px] text-text-muted italic">
                                UTR: Not submitted yet
                              </div>
                            )}
                            {m2.receipt_url && (
                              <a
                                href={m2.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-primary font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <MdReceipt size={11} /> View Balance Receipt
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment, Settlement & Audit Information */}
                  <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 pb-1 border-b border-border/50">
                      <MdCreditCard size={16} className="text-primary" />
                      Payment & Settlement Verification
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-text-muted block">Payment Method</span>
                        <span className="font-semibold text-text-primary">
                          {details?.payment_info?.payment_method || transaction?.payment_method || 'Online Banking / Gateway'}
                        </span>
                      </div>

                      <div>
                        <span className="text-text-muted block">UTR / Payment Reference</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-primary">
                            {details?.payment_info?.utr_reference || transaction?.utr_reference || transaction?.payment_reference || 'N/A'}
                          </span>
                          {(details?.payment_info?.utr_reference || transaction?.utr_reference) && (
                            <button
                              onClick={() => copyToClipboard(details?.payment_info?.utr_reference || transaction?.utr_reference, 'utr')}
                              className="text-text-muted hover:text-primary transition-colors"
                              title="Copy UTR"
                            >
                              {copiedField === 'utr' ? <span className="text-[10px] text-emerald-600 font-bold">Copied!</span> : <MdContentCopy size={13} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-text-muted block">Transaction / Payment Date</span>
                        <span className="font-semibold text-text-primary">
                          {formatDate(details?.payment_info?.payment_date || details?.payment_date || transaction?.payment_date || transaction?.created_at)}
                        </span>
                      </div>

                      {!isDirectEpc && (
                        <div>
                          <span className="text-text-muted block">Commission Settlement Status</span>
                          <div className="mt-1">
                            {renderStatusBadge(
                              details?.payment_info?.commission_status || details?.commission_status || transaction?.commission_status
                            )}
                          </div>
                        </div>
                      )}

                      {(details?.payment_info?.receipt_url || transaction?.receipt_url) && (
                        <div className="sm:col-span-2 pt-3 mt-1 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-primary/5 p-3 rounded-xl">
                          <div>
                            <span className="text-[11px] font-bold text-text-muted uppercase block">Uploaded Payment Receipt</span>
                            <span className="text-xs font-semibold text-text-primary truncate max-w-[240px] block">
                              {details?.payment_info?.receipt_filename || transaction?.receipt_filename || "Payment_Receipt_Proof.pdf"}
                            </span>
                          </div>
                          <a
                            href={details?.payment_info?.receipt_url || transaction?.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-xs shrink-0"
                          >
                            <MdReceipt size={14} />
                            View Attached Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback Messages */}
                  {actionSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                      <MdCheckCircle className="text-emerald-500 shrink-0" />
                      <span>{actionSuccessMsg}</span>
                    </div>
                  )}

                  {actionErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                      <MdErrorOutline className="text-red-500 shrink-0" />
                      <span>{actionErrorMsg}</span>
                    </div>
                  )}

                  {/* Accounts Verification Action Panel */}
                  {(() => {
                    const pm = details?.payment_milestones || details?.payment_info?.payment_milestones || transaction?.payment_milestones;
                    const mList = pm?.milestones || [];
                    const m1 = mList.find(m => m.milestone_number === 1);
                    const m2 = mList.find(m => m.milestone_number === 2);

                    const isM1Pending = pm && (m1?.payment_status === 'pending_verification' || pm.milestone_verification_status === 'advance_pending');
                    const isM2Pending = pm && (m2?.payment_status === 'pending_verification' || pm.milestone_verification_status === 'final_payment_pending_verification');

                    const isLegacyPending = !pm && ((
                      String(
                        details?.payment_info?.payment_status ||
                        details?.payment_status ||
                        transaction?.payment_status ||
                        transaction?.status ||
                        ""
                      ).toLowerCase().includes("pending") ||
                      details?.payment_info?.verification_status === "pending_verification" ||
                      details?.payment_status === "pending_verification" ||
                      transaction?.payment_status === "pending_verification"
                    ) && (details?.payment_info?.payment_status !== "Paid" && details?.payment_status !== "Paid" && transaction?.payment_status !== "Paid"));

                    if (!isM1Pending && !isM2Pending && !isLegacyPending) return null;

                    return (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-white rounded">
                            Accounts Action Required
                          </span>
                          <h4 className="text-xs font-extrabold text-text-primary mt-1">
                            {isM1Pending
                              ? "Verify Milestone 1 Advance (30%) & Issue Proforma Invoice"
                              : isM2Pending
                              ? "Verify Milestone 2 Balance (70%) & Issue GST Tax Invoice"
                              : "Verify Bank Statement Deposit & UTR Reference"}
                          </h4>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {isM1Pending
                              ? "Confirm advance funds match UTR in SolarKits bank account to release order for warehouse assembly."
                              : isM2Pending
                              ? "Confirm balance funds match UTR in SolarKits bank account to stage order for final dispatch."
                              : "Confirm funds match UTR in SolarKits bank account before approving."}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {isM1Pending ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprovePayment(1)}
                              loading={actionLoading}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex-1 justify-center py-2.5"
                            >
                              <MdCheckCircle size={15} /> Approve Advance & Generate PI
                            </Button>
                          ) : isM2Pending ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprovePayment(2)}
                              loading={actionLoading}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex-1 justify-center py-2.5"
                            >
                              <MdCheckCircle size={15} /> Approve Balance & Issue Tax Invoice
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprovePayment(null)}
                              loading={actionLoading}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex-1 justify-center py-2.5"
                            >
                              <MdCheckCircle size={15} /> Approve & Generate Tax Invoice
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectModal(true)}
                            className="text-xs font-bold text-red-600 border-red-300 hover:bg-red-50 py-2.5"
                          >
                            <MdErrorOutline size={15} /> Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dispatch & Waybill Tracking Section */}
                  {(String(details?.payment_info?.payment_status || details?.payment_status || transaction?.status).toLowerCase() === "captured" ||
                    String(details?.payment_info?.payment_status || details?.payment_status || transaction?.status).toLowerCase() === "paid") && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-purple-900 dark:text-purple-200">
                          Logistics & Dispatch Tracking
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDispatchSection(!showDispatchSection)}
                          className="text-purple-700 font-bold hover:underline"
                        >
                          {showDispatchSection ? "Cancel" : details?.payment_info?.dispatch_tracking?.tracking_number ? "Edit Dispatch Info" : "+ Enter Dispatch Info"}
                        </button>
                      </div>

                      {details?.payment_info?.dispatch_tracking?.tracking_number && !showDispatchSection && (
                        <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                          <p>Courier: <strong>{details.payment_info.dispatch_tracking.courier_name}</strong></p>
                          <p className="font-mono">LR/Waybill: <strong>{details.payment_info.dispatch_tracking.tracking_number}</strong></p>
                          {details.payment_info.dispatch_tracking.tracking_url && (
                            <a
                              href={details.payment_info.dispatch_tracking.tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-bold hover:underline inline-block mt-1"
                            >
                              Live Courier URL &rarr;
                            </a>
                          )}
                        </div>
                      )}

                      {showDispatchSection && (
                        <form onSubmit={handleSaveDispatch} className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-text-muted uppercase mb-0.5">Courier Name</label>
                              <input
                                type="text"
                                placeholder="Courier Name (e.g. VRL Logistics)"
                                value={courierName}
                                onChange={(e) => setCourierName(e.target.value)}
                                className="w-full p-2 text-xs border border-border rounded-lg bg-surface"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-text-muted uppercase mb-0.5">LR / Tracking Number</label>
                              <input
                                type="text"
                                placeholder="LR / Tracking Number"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="w-full p-2 text-xs border border-border rounded-lg bg-surface font-mono"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-text-muted uppercase mb-0.5">Estimated Delivery Date & Time</label>
                              <input
                                type="datetime-local"
                                value={estimatedDelivery}
                                onChange={(e) => setEstimatedDelivery(e.target.value)}
                                className="w-full p-2 text-xs border border-border rounded-lg bg-surface font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-text-muted uppercase mb-0.5">Tracking URL (Optional)</label>
                              <input
                                type="url"
                                placeholder="Tracking URL (optional)"
                                value={trackingUrl}
                                onChange={(e) => setTrackingUrl(e.target.value)}
                                className="w-full p-2 text-xs border border-border rounded-lg bg-surface"
                              />
                            </div>
                          </div>
                          <Button type="submit" variant="primary" size="sm" loading={actionLoading} className="text-xs w-full justify-center">
                            Save Dispatch Tracking
                          </Button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Rejection Modal Dialog */}
                  {showRejectModal && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black text-red-600 dark:text-red-400">
                        Enter Rejection Reason for EPC Contractor
                      </h4>
                      <textarea
                        rows={2}
                        placeholder="e.g. UTR number does not match bank credit, or amount deposited is ₹10,000 less than invoice total."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full p-2.5 text-xs bg-surface border border-red-300 rounded-xl focus:outline-none focus:border-red-500"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowRejectModal(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleRejectPayment}
                          loading={actionLoading}
                          className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white border-none"
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-surface border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted hidden sm:inline-block">
                SolarKits Financial Audit ID: {String(details?.transaction_id || transaction?.id || '').slice(-12)}
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <MdReceipt size={15} />
                  Print / Export
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onClose}
                  className="text-xs font-semibold px-4"
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
