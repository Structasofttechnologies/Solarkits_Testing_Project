/**
 * AdminApprovalBoard.jsx
 * Section F: Admin Approval Tasks (Action Required Board)
 * Shows pending count, oldest pending request, assigned approver, age, and overdue count.
 */

import React, { useState } from 'react';
import {
  FiCheckSquare,
  FiClock,
  FiUser,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiArrowRight,
  FiDollarSign,
} from 'react-icons/fi';
import { MdVerifiedUser, MdAssignmentTurnedIn, MdOutlineLocalShipping } from 'react-icons/md';

export default function AdminApprovalBoard({ tasks = [], onApproveAction }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');

  const handleAction = (status) => {
    if (onApproveAction && selectedTask) {
      onApproveAction(selectedTask, status, decisionNote);
    }
    setSelectedTask(null);
    setDecisionNote('');
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
            <MdVerifiedUser size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Admin Action Required — Approval Queues</h2>
            <p className="text-xs text-text-muted">
              Critical stage sign-offs, financial releases, and rate variance approvals
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          Executive Attention Needed
        </span>
      </div>

      {/* Grid of Approval Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tasks.map((task) => {
          const hasOverdue = task.overdueCount > 0;
          return (
            <div
              key={task.id}
              className={`bg-surface rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${
                hasOverdue ? 'border-danger/40 hover:border-danger' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedTask(task)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-text line-clamp-1">{task.name}</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      hasOverdue
                        ? 'bg-danger/10 text-danger border-danger/30'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}
                  >
                    {task.count} Pending
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-text-muted mt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FiClock size={12} className="text-text-muted shrink-0" />
                      Oldest Request:
                    </span>
                    <span className="font-medium text-text truncate max-w-[140px]">{task.oldestPending}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FiUser size={12} className="text-text-muted shrink-0" />
                      Assigned Approver:
                    </span>
                    <span className="font-semibold text-text truncate max-w-[140px]">{task.assignedApprover}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Age of Request:</span>
                    <span className="font-bold text-text">{task.age}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Overdue Count:</span>
                    <span
                      className={`font-black ${
                        task.overdueCount > 0 ? 'text-danger' : 'text-emerald-600'
                      }`}
                    >
                      {task.overdueCount} {task.overdueCount > 0 ? 'Breached' : 'Within TAT'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-primary font-semibold">
                <span>Review & Sign Off</span>
                <FiArrowRight size={13} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Quick Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">Process Approval: {selectedTask.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-text-muted hover:text-text cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="bg-surface-subtle p-3 rounded-xl border border-border text-xs space-y-1">
              <div>
                <span className="text-text-muted">Total Pending: </span>
                <b className="text-text">{selectedTask.count} items</b>
              </div>
              <div>
                <span className="text-text-muted">Oldest Request: </span>
                <b className="text-text">{selectedTask.oldestPending}</b>
              </div>
              <div>
                <span className="text-text-muted">Assigned Approver: </span>
                <b className="text-text">{selectedTask.assignedApprover}</b>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Decision Note / Executive Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Enter remarks for audit trail..."
                className="w-full text-xs rounded-xl border border-border bg-bg p-2.5 text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleAction('rejected')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
              >
                <FiX size={14} />
                Reject / Return
              </button>
              <button
                type="button"
                onClick={() => handleAction('approved')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <FiCheck size={14} />
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

