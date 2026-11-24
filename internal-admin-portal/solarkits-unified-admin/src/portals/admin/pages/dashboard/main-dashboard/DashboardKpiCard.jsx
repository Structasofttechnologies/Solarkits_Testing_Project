import React from 'react';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiExternalLink,
  FiEye,
  FiUsers,
  FiGlobe,
  FiFileText,
  FiCheckCircle,
  FiShoppingBag,
  FiDollarSign,
  FiZap,
} from 'react-icons/fi';

/**
 * Format currency in Indian Lakhs / Crores or thousands
 */
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Choose icon based on KPI id
 */
const getKpiIcon = (id) => {
  if (id.includes('visitor')) return <FiGlobe className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
  if (id.includes('enquir')) return <FiFileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
  if (id.includes('epc')) return <FiUsers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  if (id.includes('order') || id.includes('lead')) return <FiShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
  if (id.includes('revenue') || id.includes('collection') || id.includes('value')) return <FiDollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
  if (id.includes('demand') || id.includes('kw')) return <FiZap className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
  return <FiCheckCircle className="w-4 h-4 text-primary" />;
};

export default function DashboardKpiCard({ card, onDrillDown }) {
  const {
    id,
    title,
    current,
    previous,
    pct = 0,
    trend = 'neutral',
    format = 'number',
    sectionKey,
  } = card;

  // Format displayed values
  const formatValue = (val) => {
    if (format === 'currency') return formatCurrency(val);
    if (format === 'kw') return `${(Number(val) || 0).toLocaleString('en-IN')} kW`;
    return (Number(val) || 0).toLocaleString('en-IN');
  };

  const isUp = trend === 'up';
  const isDown = trend === 'down';

  return (
    <div
      onClick={() => onDrillDown && onDrillDown(sectionKey, title, id)}
      className="group relative bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark hover:border-primary/50 dark:hover:border-primary/50 rounded-2xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header: Icon and Drill-down Hint */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-bg-light dark:bg-bg-dark border border-border/60 dark:border-border-dark flex items-center justify-center">
          {getKpiIcon(id)}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-primary">
          <span>Details</span>
          <FiExternalLink className="w-3 h-3" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark line-clamp-1 mb-1">
        {title}
      </h3>

      {/* Current Metric Value */}
      <div className="text-xl md:text-2xl font-black text-text-primary dark:text-text-primary-dark tracking-tight mb-2">
        {formatValue(current)}
      </div>

      {/* Comparison Bottom Footer */}
      <div className="pt-2 border-t border-border/50 dark:border-border-dark/50 flex items-center justify-between text-xs">
        {/* Trend Percentage Badge */}
        <div
          className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md ${
            isUp
              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
              : isDown
              ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
              : 'text-text-secondary bg-bg-light dark:bg-bg-dark'
          }`}
        >
          {isUp && <FiTrendingUp className="w-3 h-3" />}
          {isDown && <FiTrendingDown className="w-3 h-3" />}
          {!isUp && !isDown && <FiMinus className="w-3 h-3" />}
          <span>{pct}%</span>
        </div>

        {/* Previous Period Label */}
        <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
          vs prev: {formatValue(previous)}
        </span>
      </div>
    </div>
  );
}
