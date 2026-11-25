import React from "react";
import {
  FaUndoAlt,
  FaFileInvoice,
  FaExclamationCircle,
  FaCheckCircle,
  FaHourglassHalf,
  FaExchangeAlt,
  FaHandHoldingUsd,
  FaBoxOpen,
  FaArrowRight,
} from "react-icons/fa";

export default function ReturnsTicketsSection({
  data = {},
  onSelectTicket,
  onSelectOrder,
}) {
  const ticketCards = [
    {
      label: "Total Open Tickets",
      val: data.total_open_tickets ?? 0,
      icon: <FaUndoAlt />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800/40",
    },
    {
      label: "New Return Requests",
      val: data.new_return_requests ?? 0,
      icon: <FaBoxOpen />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800/40",
    },
    {
      label: "Return Approval Pending",
      val: data.return_approval_pending ?? 0,
      icon: <FaHourglassHalf />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800/40",
    },
    {
      label: "Replacement In Progress",
      val: data.replacement_in_progress ?? 0,
      icon: <FaExchangeAlt />,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-200 dark:border-purple-800/40",
    },
    {
      label: "Supplier Return Pending",
      val: data.supplier_return_pending ?? 0,
      icon: <FaUndoAlt />,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-800/40",
    },
    {
      label: "Refund Pending",
      val: data.refund_pending ?? 0,
      icon: <FaHandHoldingUsd />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/40",
    },
    {
      label: "Return Cases Overdue",
      val: data.return_cases_overdue ?? 0,
      icon: <FaExclamationCircle />,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-200 dark:border-red-800/40",
    },
    {
      label: "Closed Tickets",
      val: data.closed_tickets ?? 0,
      icon: <FaCheckCircle />,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800/40",
    },
  ];

  return (
    <div className="card p-5 space-y-4 border border-border/80 shadow-xs w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 text-sm">
              <FaUndoAlt />
            </span>
            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase">
              Returns & Support Tickets
            </h3>
            <span className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              Post-Delivery Claims & Replacements
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitor kit component defects, transit damages, supplier reverse logistics, and customer refunds.
          </p>
        </div>
      </div>

      {/* Ticket Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 w-full max-w-full">
        {ticketCards.map((card, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border bg-surface flex flex-col justify-between hover:shadow-xs transition-all min-w-0 ${card.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm ${card.color}`}>{card.icon}</span>
              <span className="text-base font-black text-text-primary">
                {card.val}
              </span>
            </div>
            <div className="mt-2 min-w-0">
              <h5 className="text-[10px] font-bold text-text-primary leading-tight truncate" title={card.label}>
                {card.label}
              </h5>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Records Table */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-text-primary uppercase tracking-wider text-[11px]">
            Active Service & Return Tickets
          </span>
          <span className="text-[11px] text-text-muted">
            Tracked in sync with Service Tickets module
          </span>
        </div>

        <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-surface-hover border-b border-border text-[10px] uppercase font-bold text-text-muted">
              <tr>
                <th className="py-2.5 px-3">Ticket # / Order</th>
                <th className="py-2.5 px-3">Customer / Partner</th>
                <th className="py-2.5 px-3">Reason / Description</th>
                <th className="py-2.5 px-3">Ticket Date</th>
                <th className="py-2.5 px-3">Assigned Team</th>
                <th className="py-2.5 px-3">Current Status</th>
                <th className="py-2.5 px-3">Next Action</th>
                <th className="py-2.5 px-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-surface">
              {(data.tickets || []).length > 0 ? (
                data.tickets.map((ticket) => (
                  <tr key={ticket.ticket_number} className="hover:bg-surface-hover/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-text-primary">
                        {ticket.ticket_number}
                      </div>
                      <span
                        onClick={() => onSelectOrder?.(ticket.order_number)}
                        className="font-mono text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {ticket.order_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-primary">
                      {ticket.customer}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary max-w-xs truncate" title={ticket.reason}>
                      {ticket.reason}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-text-secondary">
                      {ticket.ticket_date}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-hover border border-border text-text-secondary">
                        {ticket.assigned_team}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.current_status.includes("Progress")
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                            : ticket.current_status.includes("Pending")
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                          }`}
                      >
                        {ticket.current_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-text-primary text-[11px] max-w-xs truncate" title={ticket.next_action}>
                      {ticket.next_action}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectTicket?.(ticket)}
                        className="text-primary hover:text-primary-hover font-bold text-[11px] inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Review</span>
                        <FaArrowRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-text-muted italic text-xs">
                    No active service or return tickets found. All post-delivery claims are in good standing.
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

