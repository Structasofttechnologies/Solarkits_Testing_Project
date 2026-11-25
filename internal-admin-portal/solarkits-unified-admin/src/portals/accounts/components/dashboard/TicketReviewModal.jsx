import React, { useState } from "react";
import {
  FaTimes,
  FaUndoAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaFileInvoice,
  FaShieldAlt,
} from "react-icons/fa";

export default function TicketReviewModal({
  ticket,
  isOpen,
  onClose,
  onActionComplete,
}) {
  const [remarks, setRemarks] = useState("");
  const [actionDone, setActionDone] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleExecute = (actionType) => {
    setActionDone(true);
    setTimeout(() => {
      onActionComplete?.(ticket.ticket_number, actionType, remarks);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 text-sm">
              <FaUndoAlt />
            </span>
            <div>
              <h3 className="text-sm font-black text-text-primary">
                Review Service Ticket — {ticket.ticket_number}
              </h3>
              <p className="text-[11px] text-text-muted">
                Order: <strong className="text-primary font-mono">{ticket.order_number}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Customer & Issue */}
          <div className="p-3 rounded-xl bg-surface-hover border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-text-muted">
                Raised by: {ticket.customer}
              </span>
              <span className="text-[10px] font-mono text-text-muted font-bold">
                Date: {ticket.ticket_date}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-text-muted block">Defect / Damage Reason:</span>
              <p className="text-xs font-semibold text-text-primary mt-0.5">
                {ticket.reason}
              </p>
            </div>
          </div>

          {/* Current State & Action */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl border border-border bg-surface">
              <span className="text-[10px] text-text-muted block">Current Stage</span>
              <span className="font-bold text-primary block mt-0.5">{ticket.current_status}</span>
              <span className="text-[10px] text-text-secondary block mt-0.5">Team: {ticket.assigned_team}</span>
            </div>

            <div className="p-2.5 rounded-xl border border-border bg-surface">
              <span className="text-[10px] text-text-muted block">Recommended Next Step</span>
              <span className="font-bold text-text-primary block mt-0.5">{ticket.next_action}</span>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-primary">
              Account Action Notes
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Notes on replacement item allocation, supplier debit note, or credit note..."
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-hover/40 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => handleExecute("Supplier Return")}
            className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-bold text-text-secondary"
          >
            Initiate Supplier RMA
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleExecute("Authorize Replacement")}
              className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <FaExchangeAlt size={10} />
              <span>Authorize Replacement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

