/**
 * OperationsDetailDrawer.jsx
 * Slide-over Drawer for drill-down into Order Stages, Delayed Orders, and Tickets
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiClock, FiAlertTriangle, FiPackage, FiTruck, FiUser } from 'react-icons/fi';

export default function OperationsDetailDrawer({ isOpen, onClose, title, data, type }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-screen max-w-xl bg-surface shadow-2xl flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 gradient-primary text-text-inverse shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  {type === 'status' ? 'Operational Stage Audit' : type === 'ticket' ? 'Service Ticket Audit' : 'Delayed Record Details'}
                </span>
                <h2 className="text-base font-bold tracking-tight">{title || 'Stage Drill-Down'}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-text-inverse cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {type === 'status' && data && (
                <div className="space-y-4">
                  <div className="bg-surface-subtle p-4 rounded-2xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-medium">Stage Name</span>
                      <span className="text-sm font-bold text-text">{data.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-medium">Active Records</span>
                      <span className="text-base font-black text-primary">{data.count} Orders</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-medium">Operational Scope</span>
                      <span className="text-text font-medium text-right max-w-xs">{data.description}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-text text-sm">Associated Active Orders in this Stage</h3>
                  <div className="space-y-2">
                    {data.matchingRecords && data.matchingRecords.length > 0 ? (
                      data.matchingRecords.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">{item.orderNumber}</span>
                            <span className="px-2 py-0.5 rounded-md font-semibold bg-primary/10 text-primary">{data.name}</span>
                          </div>
                          <div className="text-text font-medium">Customer: {item.customer}</div>
                          <div className="text-text-muted text-[11px] flex items-center justify-between">
                            <span>Stage: {item.currentStage || data.name}</span>
                            <span>TAT: {item.configuredTat || 'Standard'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-text-muted bg-surface-subtle rounded-xl border border-border">
                        {data.count > 0 ? `${data.count} active order(s) registered in this live pipeline stage.` : 'No active orders in this stage.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {type === 'record' && data && (
                <div className="space-y-4">
                  <div className="bg-danger/5 border border-danger/20 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-danger text-sm">{data.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-md font-bold bg-danger/10 text-danger">
                        +{data.delayDays} Days Overdue
                      </span>
                    </div>
                    <div className="text-text font-medium text-xs">Customer: {data.customer}</div>
                    <div className="text-text-muted text-[11px]">Current Stage: <b>{data.currentStage}</b></div>
                  </div>

                  <div className="space-y-2 bg-surface-subtle p-4 rounded-2xl border border-border">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-text-muted">Expected Completion:</span>
                      <span className="font-semibold text-text">{data.expectedCompletionDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-text-muted">Actual Completion:</span>
                      <span className="font-semibold text-amber-600">{data.actualCompletionDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-text-muted">Configured Stage TAT:</span>
                      <span className="font-semibold text-text">{data.configuredTat}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-text-muted">Responsible Desk:</span>
                      <span className="font-semibold text-text">{data.responsibleTeam}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-text-muted block mb-1">Recommended Next Action:</span>
                      <span className="font-bold text-text bg-bg p-2 rounded-xl block border border-border">{data.nextAction}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                      Trigger Expedited Escalation
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-text hover:bg-surface-subtle cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {type === 'ticket' && data && (
                <div className="space-y-4">
                  <div className="bg-surface-subtle p-4 rounded-2xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-sm">{data.id}</span>
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {data.status}
                      </span>
                    </div>
                    <div className="text-text font-medium">{data.customer}</div>
                    <div className="text-text-muted text-[11px]">Product: <b>{data.product}</b></div>
                    <div className="text-text-muted text-[11px]">Issue: {data.issueType}</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

