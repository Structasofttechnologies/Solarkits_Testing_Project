import React, { useState } from "react";
import {
  FaTimes,
  FaTasks,
  FaCheck,
  FaClock,
  FaUserCheck,
  FaExclamationCircle,
  FaPaperPlane,
} from "react-icons/fa";

export default function TaskActionModal({
  task,
  isOpen,
  onClose,
  onSubmitStatus,
}) {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleAction = async (newStatus) => {
    setIsSubmitting(true);
    try {
      await onSubmitStatus?.(task.id, newStatus, remarks);
      onClose();
    } catch (err) {
      console.error("Failed to update task status:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary text-sm">
              <FaTasks />
            </span>
            <div>
              <h3 className="text-sm font-black text-text-primary">
                Action Task — #{task.id}
              </h3>
              <p className="text-[11px] text-text-muted">
                Linked Order: <strong className="text-primary font-mono">{task.order_number}</strong>
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
          {/* Title & Type */}
          <div className="p-3 rounded-xl bg-surface-hover border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-text-muted">
                {task.task_type} Task
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  task.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {task.priority} Priority
              </span>
            </div>
            <h4 className="text-xs font-bold text-text-primary leading-snug">
              {task.title}
            </h4>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl border border-border bg-surface">
              <span className="text-[10px] text-text-muted block">Assigned Account Manager</span>
              <span className="font-bold text-text-primary block mt-0.5">{task.assigned_to}</span>
              <span className="text-[10px] text-primary block mt-0.5">Team: {task.assigned_team || "Account"}</span>
            </div>

            <div className="p-2.5 rounded-xl border border-border bg-surface">
              <span className="text-[10px] text-text-muted block">Configured Deadline</span>
              <span className="font-bold text-text-primary block mt-0.5">{task.due_date}</span>
              <span className="text-[10px] text-amber-600 block mt-0.5">Current Status: {task.status}</span>
            </div>
          </div>

          {/* Remarks Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-primary">
              Audit Notes & Operational Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Enter details of action taken, communication with supplier, or invoice reference..."
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-hover/40 flex items-center justify-between gap-2">
          <button
            onClick={() => handleAction("In Progress")}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-bold text-text-secondary transition-all"
          >
            Mark In Progress
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction("Completed")}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <FaCheck size={11} />
              <span>Mark Completed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

