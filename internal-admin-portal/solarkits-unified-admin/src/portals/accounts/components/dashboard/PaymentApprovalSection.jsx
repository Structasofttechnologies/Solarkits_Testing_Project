import React from "react";
import {
  FaCreditCard,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaExternalLinkAlt,
  FaLock,
  FaUnlock,
  FaClock,
  FaShieldAlt,
  FaExclamationTriangle,
  FaMoneyBillWave,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function PaymentApprovalSection({
  data = {},
  onSelectOrder,
}) {
  const navigate = useNavigate();

  const financialCards = [
    {
      title: "Customer Payments Pending Verification",
      val: data.customer_payments_pending_verification ?? 0,
      sub: "Manual offline transfer proofs",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800/40",
    },
    {
      title: "Offline Payments Awaiting Admin Approval",
      val: data.offline_payments_awaiting_admin_approval ?? 0,
      sub: "Submitted to Admin for pricing clearance",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800/40",
    },
    {
      title: "Supplier 1st Payment Pending (30% Adv)",
      val: data.supplier_first_payment_pending ?? 0,
      sub: "Required to trigger supplier production",
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800/40",
    },
    {
      title: "Supplier 2nd Payment Pending (70% Bal)",
      val: data.supplier_second_payment_pending ?? 0,
      sub: "Required before factory gate dispatch",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-200 dark:border-purple-800/40",
    },
    {
      title: "Payment Requests Rejected / Returned",
      val: data.payment_requests_rejected_returned ?? 0,
      sub: "Needs correction by Account team",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-200 dark:border-red-800/40",
    },
    {
      title: "Delivery Charge Approvals Pending",
      val: data.delivery_charge_approvals_pending ?? 0,
      sub: "Transit surcharge & freight verification",
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-200 dark:border-teal-800/40",
    },
    {
      title: "Approved Awaiting Actual Processing",
      val: data.approved_awaiting_actual_payment ?? 0,
      sub: "Admin approved; bank UTR transfer pending",
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-800/40",
      highlight: true,
    },
    {
      title: "Payment-Related Overdue Orders",
      val: data.payment_related_overdue_orders ?? 0,
      sub: "Payment action delayed beyond SLA",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-200 dark:border-red-800/40",
    },
  ];

  return (
    <div className="card p-5 space-y-4 border border-border/80 shadow-xs w-full max-w-full min-w-0">
      {/* Header with Critical Governance Warning */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
              <FaCreditCard />
            </span>
            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase">
              Payment & Approval Snapshot
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Financial Control
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Strict two-tier separation between Admin approval decisions and actual banking disbursements.
          </p>
        </div>

        <button
          onClick={() => navigate("/account-panel/payments")}
          className="self-start sm:self-auto text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1.5 hover:underline"
        >
          <span>Open Supplier Payments Module</span>
          <FaExternalLinkAlt size={10} />
        </button>
      </div>

      {/* Governance Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-800 text-xs">
        <FaShieldAlt className="text-indigo-600 mt-0.5 shrink-0" size={14} />
        <div className="flex-1 leading-relaxed">
          <span className="font-extrabold text-indigo-900 dark:text-indigo-200">
            Audit Rule:
          </span>{" "}
          <span className="text-indigo-800 dark:text-indigo-300">
            Admin approval and actual bank payment are tracked separately. An approved supplier payment does not reflect as paid until the Bank UTR reference is recorded and verified by Accounts.
          </span>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 w-full max-w-full">
        {financialCards.map((card, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border bg-surface flex flex-col justify-between hover:shadow-xs transition-all min-w-0 ${card.highlight ? "ring-1 ring-indigo-400" : ""
              } ${card.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-base font-black ${card.color}`}>
                {card.val}
              </span>
              {card.highlight && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100">
                  Bank Gate
                </span>
              )}
            </div>
            <div className="mt-2 min-w-0">
              <h5 className="text-[10px] font-bold text-text-primary leading-tight line-clamp-2" title={card.title}>
                {card.title}
              </h5>
              <p className="text-[9px] text-text-muted mt-0.5 line-clamp-1 break-words" title={card.sub}>
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Actionable Financial Requests Table */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-text-primary uppercase tracking-wider text-[11px]">
            Actionable Financial Requests Queue
          </span>
          <span className="text-[11px] text-text-muted">
            Total Outstanding: ₹{(data.outstanding_customer_payments || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-surface-hover border-b border-border text-[10px] uppercase font-bold text-text-muted">
              <tr>
                <th className="py-2.5 px-3">Req ID / Order</th>
                <th className="py-2.5 px-3">Entity & Request Title</th>
                <th className="py-2.5 px-3">Request Type</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Admin Approval</th>
                <th className="py-2.5 px-3 text-center">Actual Bank Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-surface">
              {(data.pending_actions || []).length > 0 ? (
                data.pending_actions.map((action) => (
                  <tr key={action.id} className="hover:bg-surface-hover/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-text-primary">{action.id}</div>
                      <span
                        onClick={() => onSelectOrder?.(action.order_number)}
                        className="font-mono text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {action.order_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-text-primary">{action.customer_or_supplier}</div>
                      <div className="text-[10px] text-text-secondary mt-0.5">{action.title}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-hover border border-border text-text-secondary">
                        {action.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-text-primary">
                      ₹{action.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.approval_status.includes("Approved")
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          }`}
                      >
                        {action.approval_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.bank_status === "Disbursed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                          }`}
                      >
                        {action.bank_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate("/account-panel/payments")}
                        className="text-primary hover:text-primary-hover font-bold text-[11px] inline-flex items-center gap-1 hover:underline"
                      >
                        <span>{action.action}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-text-muted italic text-xs">
                    No pending financial actions requiring review at this time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

