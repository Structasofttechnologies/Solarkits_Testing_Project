import React from 'react';
import { FiX, FiCheckCircle, FiInfo, FiDatabase, FiExternalLink } from 'react-icons/fi';

export default function DemandVerifyModal({ isOpen, onClose, metric, onDrillDown }) {
  if (!isOpen || !metric) return null;

  const {
    title,
    displayValue,
    formula,
    equation,
    description,
    dataSource,
    breakdownItems = [],
    drillDownTarget,
    drillDownLabel,
  } = metric;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:bg-bg-light dark:hover:bg-bg-dark transition-colors cursor-pointer"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
            <FiInfo className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Calculation & Formula Inspector
            </h3>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{title}</p>
          </div>
        </div>

        {/* Current Metric Value Card */}
        <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary block mb-0.5">Calculated Metric Value</span>
            <div className="text-2xl font-black text-primary dark:text-primary-dark">
              {displayValue}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <FiCheckCircle className="w-3.5 h-3.5" />
            <span>Verified</span>
          </div>
        </div>

        {/* Formula Box */}
        <div className="mb-4 p-3.5 rounded-xl bg-bg-light/70 dark:bg-bg-dark border border-border/80 dark:border-border-dark">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
            Calculation Formula
          </span>
          <div className="text-xs font-mono font-bold text-primary dark:text-primary-dark break-words">
            {formula}
          </div>
          {equation && (
            <div className="text-[11px] font-mono text-text-secondary mt-1 pt-1 border-t border-border/40">
              {equation}
            </div>
          )}
        </div>

        {/* Description / Logic Note */}
        {description && (
          <div className="mb-4 text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">
            {description}
          </div>
        )}

        {/* Breakdown Items List */}
        {breakdownItems && breakdownItems.length > 0 && (
          <div className="mb-5">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Contributing Items Breakdown
            </span>
            <div className="border border-border/60 dark:border-border-dark rounded-xl overflow-hidden divide-y divide-border/40 text-xs">
              {breakdownItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 bg-bg-light/30 dark:bg-bg-dark/30 hover:bg-bg-light/60 transition-colors">
                  <div>
                    <span className="font-semibold text-text-primary dark:text-text-primary-dark block">{item.label}</span>
                    {item.subLabel && <span className="text-[10px] text-text-secondary">{item.subLabel}</span>}
                  </div>
                  <span className="font-bold text-text-primary dark:text-text-primary-dark">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Source Badge */}
        {dataSource && (
          <div className="mb-5 text-[11px] text-text-secondary flex items-center gap-1.5 p-2.5 rounded-lg bg-bg-light/50 dark:bg-bg-dark border border-border/50">
            <FiDatabase className="w-3.5 h-3.5 text-primary shrink-0" />
            <span><strong className="text-text-primary dark:text-text-primary-dark">Data Source:</strong> {dataSource}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          {drillDownTarget && onDrillDown ? (
            <button
              onClick={() => {
                onClose();
                onDrillDown(drillDownTarget, drillDownLabel || title);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <span>View Source Records</span>
              <FiExternalLink className="w-3 h-3" />
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
