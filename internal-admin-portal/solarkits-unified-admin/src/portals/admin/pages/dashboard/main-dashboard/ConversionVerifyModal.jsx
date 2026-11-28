import React from 'react';
import { FiX, FiCheckCircle, FiInfo, FiLayers, FiCalendar, FiArrowRight } from 'react-icons/fi';

export default function ConversionVerifyModal({ isOpen, onClose, metric, onDrillDown }) {
  if (!isOpen || !metric) return null;

  const { id, metric: title, formula, ratio, numerator, denominator, unit = '%' } = metric;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
            %
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Conversion Formula Verification
            </h3>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{title}</p>
          </div>
        </div>

        {/* Formula Box */}
        <div className="mb-5 p-3.5 rounded-xl bg-bg-light/70 dark:bg-bg-dark border border-border/80 dark:border-border-dark">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Documented Formula</span>
          <div className="text-sm font-mono font-bold text-primary dark:text-primary-dark">
            {formula}
          </div>
        </div>

        {/* Calculation Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Numerator */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 block mb-0.5">Numerator (Count)</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {(numerator || 0).toLocaleString()}
            </span>
          </div>

          {/* Denominator */}
          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/40 bg-sky-50/50 dark:bg-sky-950/20">
            <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-400 block mb-0.5">Denominator (Base)</span>
            <span className="text-2xl font-black text-sky-700 dark:text-sky-300">
              {(denominator || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Calculation Result Equation */}
        <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <div className="text-xs text-text-secondary mb-1">Verified Conversion Rate</div>
          <div className="text-3xl font-black text-primary dark:text-primary-dark">
            {ratio}{unit}
          </div>
          <div className="text-[11px] font-mono text-text-secondary mt-1">
            ({numerator || 0} ÷ {denominator || 0}) × 100 = {ratio}%
          </div>
        </div>

        {/* Zero Denominator Safety Indicator */}
        {Number(denominator) === 0 && (
          <div className="mb-4 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
            <FiInfo className="w-4 h-4 shrink-0" />
            <span>Zero denominator handled safely. Ratio defaults to 0.0% without NaN or error.</span>
          </div>
        )}

        {/* Action Button: View Underlying Records */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-text-secondary hover:bg-bg-light transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              if (onDrillDown) {
                let sec = 'enquiries';
                if (id === 'visitor_to_enquiry') sec = 'website';
                else if (id === 'enquiry_to_qualified') sec = 'enquiries';
                else if (id === 'qualified_to_quotation') sec = 'quotes';
                else if (id === 'quotation_to_order' || id === 'lead_to_order') sec = 'orders';
                else if (id === 'campaign_conversion') sec = 'campaign';
                onDrillDown(sec, `Records for ${title}`);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs transition-colors"
          >
            <span>View Contributing Records</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
