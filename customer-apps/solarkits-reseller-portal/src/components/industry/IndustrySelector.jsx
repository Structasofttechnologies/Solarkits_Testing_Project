/**
 * IndustrySelector.jsx
 *
 * Compact, image-first industry segment selector bar.
 * - Upper micro-label: "INDUSTRY SEGMENT" + active industry name
 * - Horizontally scrollable pill tabs with industry icons/emojis
 * - Royal blue active highlight with smooth transitions
 * - Lightweight refresh action
 */

import React from 'react';
import { FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import { MdOutlineFactory } from 'react-icons/md';

const INDUSTRY_ICON_FALLBACKS = {
  residential: '🏡',
  commercial: '🏭',
  'c&i': '🏭',
  agriculture: '🌾',
  pump: '🌾',
  utility: '⚡',
  ground: '⚡',
};

function get_industry_icon(name = '', fallbackIcon = null) {
  if (fallbackIcon && typeof fallbackIcon === 'string' && fallbackIcon.length <= 4) {
    return fallbackIcon;
  }
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(INDUSTRY_ICON_FALLBACKS)) {
    if (lower.includes(key)) return icon;
  }
  return '☀️';
}

export default function IndustrySelector({
  industries = [],
  selected = null,
  onSelect,
  loading = false,
  onRefresh = null,
  refreshing = false,
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 h-10 w-36 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!industries || industries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <MdOutlineFactory size={18} />
          <span>No active industry segments found. Please contact your account manager.</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <FiRefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all">
      {/* Micro-Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MdOutlineFactory size={18} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block leading-tight">
              INDUSTRY SEGMENT
            </span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
              {selected ? selected.name : 'Select Segment'}
            </h2>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-slate-500 hover:text-primary dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh industry content"
          >
            <FiRefreshCw size={12} className={refreshing ? 'animate-spin text-primary' : ''} />
            <span className="hidden sm:inline">Refresh Content</span>
          </button>
        )}
      </div>

      {/* Horizontally Scrollable Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {industries.map((industry) => {
          const isSelected = selected && (selected.id === industry.id || selected._id === industry._id || selected.slug === industry.slug);
          const icon = get_industry_icon(industry.name, industry.icon);

          return (
            <button
              key={industry.id || industry._id}
              onClick={() => onSelect && onSelect(industry)}
              className={`
                shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black
                transition-all duration-200 select-none cursor-pointer border
                ${isSelected
                  ? 'bg-[#185ADB] text-white border-[#185ADB] shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/70 hover:bg-blue-50 hover:text-[#185ADB] hover:border-blue-200 dark:hover:bg-slate-700/50'
                }
              `}
            >
              <span className="text-sm leading-none">{icon}</span>
              <span className="whitespace-nowrap">{industry.name}</span>
              {isSelected && <FiChevronRight size={12} className="opacity-90 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
