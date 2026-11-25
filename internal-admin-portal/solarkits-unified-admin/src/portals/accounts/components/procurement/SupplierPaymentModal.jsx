import React, { useState, useEffect } from "react";
import {
  FaCreditCard, FaCheckCircle, FaSpinner,
  FaArrowRight, FaClock, FaCheck, FaCopy, FaExternalLinkAlt
} from "react-icons/fa";
import Dialog from "../Dialog";
import Button from "../Button";
import CustomInput from "../CustomInput";
import { recordBankPayment, requestSupplierPayment } from "../../api/accounts";

export default function SupplierPaymentModal({
  isOpen,
  onClose,
  purchaseIndent,
  userRole = "Accounts",
  targetMilestone: initialMilestoneProp = null,
  onRequestPayment,
  onRecordBankPayment,
  onPaymentUpdated,
  loading: externalLoading
}) {
  const payment = purchaseIndent?.payment || {};
  const paymentStatus = payment.payment_status || "PI Submitted";
  const totalPiValue = purchaseIndent?.total_pi_value || 0;

  const advPct = payment.advance_percentage || 30;
  const balPct = payment.balance_percentage || 70;
  const advanceAmount = payment.advance_amount || Math.round((totalPiValue * advPct) / 100);
  const balanceAmount = payment.balance_amount || (totalPiValue - advanceAmount);

  // Check milestone statuses
  const isAdvancePaid = Boolean(
    payment.advance_payment?.utr_number ||
    ["Advance Paid", "Paid"].includes(paymentStatus)
  );

  const isBalancePaid = Boolean(
    payment.balance_payment?.utr_number ||
    (paymentStatus === "Paid" && isAdvancePaid)
  );

  const isFullyPaid = paymentStatus === "Paid" || (isAdvancePaid && isBalancePaid);

  // Strict Milestone Approval verification (Requires explicit milestone approval)
  const isAdvanceApproved = Boolean(
    payment.advance_approval?.status === "approved" ||
    isAdvancePaid
  );

  const isBalanceApproved = Boolean(
    payment.balance_approval?.status === "approved" ||
    paymentStatus === "Paid"
  );

  const isAdvanceRequested = Boolean(
    payment.advance_approval?.status === "pending" ||
    paymentStatus === "Advance Requested"
  );

  const isBalanceRequested = Boolean(
    payment.balance_approval?.status === "pending" ||
    paymentStatus === "Balance Requested"
  );

  // Remaining balance due
  const balanceDue = isFullyPaid ? 0 : (payment.balance_due !== undefined && payment.balance_due !== null ? payment.balance_due : balanceAmount);

  // Determine which milestone to record
  const defaultMilestone = initialMilestoneProp || (isAdvancePaid && !isFullyPaid ? "balance" : "advance");
  const [selectedMilestone, setSelectedMilestone] = useState(defaultMilestone);

  const isCurrentMilestoneApproved = selectedMilestone === "balance" ? isBalanceApproved : isAdvanceApproved;
  const isCurrentMilestoneRequested = selectedMilestone === "balance" ? isBalanceRequested : isAdvanceRequested;

  // Active tab: "record" vs "overview"
  const defaultTab = isFullyPaid ? "overview" : "record";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState("");

  // Bank record form states
  const [utrNumber, setUtrNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(defaultMilestone === "balance" ? balanceDue : advanceAmount);
  const [paymentMode, setPaymentMode] = useState("RTGS");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (purchaseIndent) {
      const adv = purchaseIndent.payment?.advance_amount || Math.round(((purchaseIndent.total_pi_value || 0) * (purchaseIndent.payment?.advance_percentage || 30)) / 100);
      const bal = purchaseIndent.payment?.balance_amount || ((purchaseIndent.total_pi_value || 0) - adv);
      const advPaid = Boolean(purchaseIndent.payment?.advance_payment?.utr_number || ["Advance Paid", "Paid"].includes(purchaseIndent.payment?.payment_status));
      const fullPaid = purchaseIndent.payment?.payment_status === "Paid";

      const target = initialMilestoneProp || (advPaid && !fullPaid ? "balance" : "advance");
      setSelectedMilestone(target);
      setActiveTab(fullPaid ? "overview" : "record");

      if (target === "balance") {
        const due = fullPaid ? 0 : (purchaseIndent.payment?.balance_due !== undefined ? purchaseIndent.payment?.balance_due : bal);
        setPaidAmount(due);
        setUtrNumber(purchaseIndent.payment?.balance_payment?.utr_number || "");
        setRemarks(`Disbursed ${purchaseIndent.payment?.balance_percentage || 70}% balance payment`);
      } else {
        setPaidAmount(adv);
        setUtrNumber(purchaseIndent.payment?.advance_payment?.utr_number || purchaseIndent.payment?.actual_payment?.utr_number || "");
        setRemarks(`Disbursed ${purchaseIndent.payment?.advance_percentage || 30}% advance payment`);
      }
    }
  }, [purchaseIndent, initialMilestoneProp]);

  // When user switches milestone in form
  const handleMilestoneSwitch = (milestone) => {
    setSelectedMilestone(milestone);
    setActiveTab("record");
    if (milestone === "balance") {
      setPaidAmount(balanceDue > 0 ? balanceDue : balanceAmount);
      setUtrNumber(payment.balance_payment?.utr_number || "");
      setRemarks(`Disbursed ${balPct}% balance payment against dispatch`);
    } else {
      setPaidAmount(advanceAmount);
      setUtrNumber(payment.advance_payment?.utr_number || payment.actual_payment?.utr_number || "");
      setRemarks(`Disbursed ${advPct}% advance payment`);
    }
  };

  if (!isOpen || !purchaseIndent) return null;

  const handleBankRecordSubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      alert("Bank UTR Number is required.");
      return;
    }

    const payload = {
      pi_id: purchaseIndent._id,
      payment_type: selectedMilestone,
      milestone: selectedMilestone,
      utr_number: utrNumber.trim().toUpperCase(),
      paid_amount: Number(paidAmount) || (selectedMilestone === "balance" ? balanceDue : advanceAmount),
      payment_mode: paymentMode,
      payment_date: paymentDate,
      remarks: remarks || `Disbursed ${paymentMode} ${selectedMilestone} payment`
    };

    if (onRecordBankPayment) {
      await onRecordBankPayment(payload);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordBankPayment(payload);
      if (res?.status === "success") {
        if (onPaymentUpdated) onPaymentUpdated(res.data);
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record bank payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPaymentRequest = async () => {
    setIsRequesting(true);
    try {
      if (onRequestPayment) {
        await onRequestPayment({
          pi_id: purchaseIndent._id,
          payment_type: selectedMilestone,
          remarks: `Payment request for ${selectedMilestone} submitted from Supplier Payment Modal`
        });
      } else {
        const res = await requestSupplierPayment({
          pi_id: purchaseIndent._id,
          payment_type: selectedMilestone,
          remarks: `Payment request for ${selectedMilestone} submitted from Supplier Payment Modal`
        });
        if (res?.status === "success") {
          alert(`✅ ${res.message || "Payment request submitted to Admin for approval."}`);
          if (onPaymentUpdated) onPaymentUpdated(res.data);
          onClose();
        }
      }
    } catch (err) {
      console.error("Error submitting payment request:", err);
      alert(err.response?.data?.message || "Failed to submit payment request to Admin.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(""), 2000);
  };

  const isBusy = externalLoading || isSubmitting;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Supplier Payment Card — PI #${purchaseIndent.pi_number}`} size="lg">
      <div className="space-y-4 p-1 text-text-primary">
        
        {/* Status Tracker Bar */}
        <div className="bg-surface border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
              Customer Order &amp; Supplier
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black text-text-primary">
                Order #{purchaseIndent.customer_order_number}
              </span>
              <span className="text-xs font-bold text-text-muted">•</span>
              <span className="text-xs font-bold text-primary">
                {purchaseIndent.supplier_name}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
              Overall Payment Status
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mt-0.5 border ${
              isFullyPaid
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : isAdvancePaid
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : "bg-blue-500/10 text-blue-600 border-blue-500/30"
            }`}>
              <FaCreditCard className="text-xs" />
              {isFullyPaid ? "Fully Paid (100%)" : isAdvancePaid ? "Advance Paid (70% Due)" : paymentStatus}
            </span>
          </div>
        </div>

        {/* ── 2-STAGE MILESTONE PROGRESS STEPPER ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Milestone 1: 30% Advance */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            isAdvancePaid
              ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
              : "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                {isAdvancePaid ? <FaCheck className="text-emerald-600 text-xs" /> : <FaClock className="text-blue-600 text-xs" />}
                Milestone 1 • {advPct}% Advance
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                isAdvancePaid ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-blue-100 text-blue-800 border-blue-300"
              }`}>
                {isAdvancePaid ? "Paid" : "Advance Due"}
              </span>
            </div>
            <div className="text-base font-black text-gray-900 dark:text-white">
              ₹{advanceAmount.toLocaleString("en-IN")}
            </div>
            {payment.advance_payment?.utr_number || (isAdvancePaid && payment.actual_payment?.utr_number) ? (
              <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span className="font-mono font-bold truncate">
                  UTR: {payment.advance_payment?.utr_number || payment.actual_payment?.utr_number}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyUtr(payment.advance_payment?.utr_number || payment.actual_payment?.utr_number)}
                  className="text-gray-400 hover:text-primary transition-colors cursor-pointer text-[10px] ml-1"
                  title="Copy UTR"
                >
                  {copiedUtr === (payment.advance_payment?.utr_number || payment.actual_payment?.utr_number) ? "Copied!" : <FaCopy />}
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-gray-500 block mt-0.5">Payable at order placement</span>
            )}
          </div>

          {/* Milestone 2: 70% Balance */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            isBalancePaid
              ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
              : isAdvancePaid
              ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs"
              : "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/50 opacity-80"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                {isBalancePaid ? <FaCheck className="text-emerald-600 text-xs" /> : <FaClock className={isAdvancePaid ? "text-amber-600 text-xs" : "text-gray-400 text-xs"} />}
                Milestone 2 • {balPct}% Balance
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                isBalancePaid
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : isAdvancePaid
                  ? "bg-amber-100 text-amber-800 border-amber-300 font-extrabold animate-pulse"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                {isBalancePaid ? "Paid" : isAdvancePaid ? "Ready To Pay (70% Due)" : "Locked Until Advance"}
              </span>
            </div>
            <div className="text-base font-black text-gray-900 dark:text-white">
              ₹{balanceDue > 0 ? balanceDue.toLocaleString("en-IN") : balanceAmount.toLocaleString("en-IN")}
            </div>
            {payment.balance_payment?.utr_number ? (
              <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span className="font-mono font-bold truncate">
                  UTR: {payment.balance_payment.utr_number}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyUtr(payment.balance_payment.utr_number)}
                  className="text-gray-400 hover:text-primary transition-colors cursor-pointer text-[10px] ml-1"
                  title="Copy UTR"
                >
                  {copiedUtr === payment.balance_payment.utr_number ? "Copied!" : <FaCopy />}
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block mt-0.5">
                {isAdvancePaid ? "Payable before supplier dispatch" : "Pending advance clearance"}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border text-xs font-bold gap-2 pt-1">
          {isAdvancePaid && !isFullyPaid && (
            <button
              type="button"
              onClick={() => handleMilestoneSwitch("balance")}
              className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "record" && selectedMilestone === "balance"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Record 70% Balance Payment</span>
            </button>
          )}

          {!isAdvancePaid && (
            <button
              type="button"
              onClick={() => handleMilestoneSwitch("advance")}
              className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "record" && selectedMilestone === "advance"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <span>Record 30% Advance Payment</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === "overview" ? "border-primary text-primary font-black" : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            Payment Terms &amp; All UTR Receipts
          </button>
        </div>

        {/* TAB 1: RECORD BANK PAYMENT (ADVANCE OR BALANCE) */}
        {activeTab === "record" && (
          <form onSubmit={handleBankRecordSubmit} className="space-y-4">
            {/* Approval Workflow State Banner */}
            {!isCurrentMilestoneApproved ? (
              isCurrentMilestoneRequested ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FaClock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />
                    <div>
                      <strong className="block font-bold">Admin Stage Authorization Pending</strong>
                      <span>
                        Payment request for {selectedMilestone === "balance" ? `${balPct}% Balance` : `${advPct}% Advance`} has been submitted to Admin. Bank UTR can be recorded only after approval is granted.
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                    ⏳ In Approval Queue
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-900 dark:text-blue-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FaClock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div>
                      <strong className="block font-bold">Action Required: Raise Payment Request</strong>
                      <span>
                        Direct payment is prohibited. Accounts must raise a {selectedMilestone === "balance" ? `${balPct}% Balance` : `${advPct}% Advance`} payment request for Admin authorization first.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isRequesting}
                    onClick={handleSendPaymentRequest}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-primary hover:bg-primary/90 text-white shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {isRequesting ? <FaSpinner className="animate-spin text-xs" /> : <FaArrowRight size={10} />}
                    <span>{isRequesting ? "Submitting..." : `Raise ${selectedMilestone === "balance" ? `${balPct}% Balance` : `${advPct}% Advance`} Request`}</span>
                  </button>
                </div>
              )
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2.5">
                <FaCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Admin Approved &amp; Authorized</strong>
                  <span>
                    Admin has approved this {selectedMilestone === "balance" ? `${balPct}% Balance` : `${advPct}% Advance`} payment. Please execute disbursement and record the bank UTR below.
                  </span>
                </div>
              </div>
            )}

            <div className={`p-3.5 rounded-xl border text-xs text-text-primary flex items-start gap-3 ${
              selectedMilestone === "balance"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
            }`}>
              <div className="pt-0.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  selectedMilestone === "balance" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                }`}>
                  {selectedMilestone === "balance" ? `Milestone 2 (${balPct}% Balance)` : `Milestone 1 (${advPct}% Advance)`}
                </span>
              </div>
              <div>
                <strong className="block mb-0.5 font-bold">
                  {selectedMilestone === "balance"
                    ? `Disbursing ${balPct}% Final Settlement before Material Dispatch`
                    : `Disbursing ${advPct}% Advance at Order Placement`}
                </strong>
                <span>
                  {selectedMilestone === "balance"
                    ? `Logging this payment will fulfill the supplier PI and set status to 'Paid' (100% Settled). Dispatch will be unlocked.`
                    : `Logging this payment will transition status to 'Advance Paid'. Supplier will begin manufacturing batch.`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label={`Bank UTR Number / Reference (${selectedMilestone.toUpperCase()}) *`}
                required
                disabled={!isCurrentMilestoneApproved}
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="e.g. ICICR20261014000123"
              />
              <CustomInput
                label={`Amount Paid (₹) * [${selectedMilestone === "balance" ? `${balPct}% Balance Due` : `${advPct}% Advance`}]`}
                type="number"
                required
                disabled={!isCurrentMilestoneApproved}
                min="1"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              />
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  disabled={!isCurrentMilestoneApproved}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 bg-bg border border-border rounded-xl text-xs font-bold text-text-primary outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="RTGS">RTGS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="ICICI eCollection">ICICI eCollection</option>
                  <option value="IMPS">IMPS</option>
                  <option value="NetBanking">NetBanking</option>
                </select>
              </div>
              <CustomInput
                label="Payment Date *"
                type="date"
                required
                disabled={!isCurrentMilestoneApproved}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <CustomInput
              label="Accounts Payment Remarks (Optional)"
              disabled={!isCurrentMilestoneApproved}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={`e.g. ${selectedMilestone === "balance" ? "Final 70% balance disbursed against dispatch notice" : "30% Advance disbursed as per quote"}`}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isBusy || !isCurrentMilestoneApproved}
                className={selectedMilestone === "balance" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
              >
                {isBusy ? (
                  <span className="flex items-center gap-1.5">
                    <FaSpinner className="animate-spin text-xs" />
                    Recording...
                  </span>
                ) : !isCurrentMilestoneApproved ? (
                  "Awaiting Admin Approval"
                ) : (
                  `Record ${selectedMilestone === "balance" ? `${balPct}% Balance` : `${advPct}% Advance`} Payment`
                )}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: OVERVIEW & AUDIT */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg border border-border rounded-xl p-3 text-center">
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase block">Total PI Value</span>
                <span className="text-sm font-black text-text-primary">
                  ₹{totalPiValue.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase block">
                  Advance ({advPct}%)
                </span>
                <span className="text-sm font-black text-primary">
                  ₹{advanceAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase block">
                  Balance ({balPct}%)
                </span>
                <span className="text-sm font-black text-text-primary">
                  ₹{balanceAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase block">Balance Due</span>
                <span className={`text-sm font-black ${balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  ₹{balanceDue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Quick Action Button to Pay Balance if Advance Paid & Balance Pending */}
            {isAdvancePaid && !isFullyPaid && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Milestone 2 ({balPct}% Balance) Outstanding
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    ₹{balanceDue.toLocaleString("en-IN")} is ready for disbursement. Click to log the final bank UTR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleMilestoneSwitch("balance")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>Pay {balPct}% Balance Now</span>
                  <FaArrowRight size={10} />
                </button>
              </div>
            )}

            {/* Recorded UTR Receipts */}
            <div className="bg-surface border border-border rounded-xl p-3.5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Disbursement Audit Receipts
              </h4>

              {/* Advance UTR */}
              <div className={`p-3 rounded-lg border text-xs ${
                isAdvancePaid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-gray-50 border-gray-200 opacity-60"
              }`}>
                <div className="flex justify-between items-center">
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    Milestone 1 • {advPct}% Advance Disbursement:
                  </strong>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    isAdvancePaid ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                  }`}>
                    {isAdvancePaid ? "Paid" : "Pending"}
                  </span>
                </div>
                {payment.advance_payment?.utr_number || (isAdvancePaid && payment.actual_payment?.utr_number) ? (
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-text-primary text-xs">
                        UTR #{payment.advance_payment?.utr_number || payment.actual_payment?.utr_number}
                      </span>
                      <span className="text-text-muted ml-2">
                        ({(payment.advance_payment?.payment_mode || payment.actual_payment?.payment_mode || "RTGS")} • ₹{(payment.advance_payment?.paid_amount || payment.actual_payment?.paid_amount || advanceAmount).toLocaleString("en-IN")})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyUtr(payment.advance_payment?.utr_number || payment.actual_payment?.utr_number)}
                      className="text-gray-400 hover:text-primary transition-colors text-xs cursor-pointer"
                    >
                      {copiedUtr === (payment.advance_payment?.utr_number || payment.actual_payment?.utr_number) ? "Copied" : <FaCopy />}
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400 block mt-1">No advance payment recorded yet.</span>
                )}
              </div>

              {/* Balance UTR */}
              <div className={`p-3 rounded-lg border text-xs ${
                isBalancePaid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex justify-between items-center">
                  <strong className="text-amber-700 dark:text-amber-400">
                    Milestone 2 • {balPct}% Balance Disbursement:
                  </strong>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    isBalancePaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {isBalancePaid ? "Paid (100% Settled)" : "Pending (Due)"}
                  </span>
                </div>
                {payment.balance_payment?.utr_number ? (
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-text-primary text-xs">
                        UTR #{payment.balance_payment.utr_number}
                      </span>
                      <span className="text-text-muted ml-2">
                        ({payment.balance_payment.payment_mode} • ₹{(payment.balance_payment.paid_amount || balanceAmount).toLocaleString("en-IN")})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyUtr(payment.balance_payment.utr_number)}
                      className="text-gray-400 hover:text-primary transition-colors text-xs cursor-pointer"
                    >
                      {copiedUtr === payment.balance_payment.utr_number ? "Copied" : <FaCopy />}
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400 block mt-1">
                    {isAdvancePaid ? "Advance is paid. Balance is pending disbursement." : "Awaiting advance payment first."}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Dialog>
  );
}
