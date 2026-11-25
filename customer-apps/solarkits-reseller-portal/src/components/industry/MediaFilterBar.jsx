/**
 * MediaFilterBar.jsx
 *
 * Compact Media-Type Filter Pills & Sort Selector.
 * - Filters: All, Videos, Photos, Posters (with real item counts)
 * - Sort: Featured, Newest, Most Viewed
 * - Instant client-side switching with smooth state updates
 */

import React from 'react';
import { FiVideo, FiImage, FiFileText, FiGrid, FiSliders } from 'react-icons/fi';

const FILTER_CONFIG = [
  { key: 'ALL', label: 'All Media', icon: FiGrid },
  { key: 'VIDEO', label: 'Videos', icon: FiVideo },
  { key: 'PHOTO', label: 'Photos', icon: FiImage },
  { key: 'POSTER', label: 'Posters', icon: FiFileText },
];

const SORT_OPTIONS = [
  { value: 'FEATURED', label: 'Featured First' },
  { value: 'NEWEST', label: 'Newest Added' },
  { value: 'POPULAR', label: 'Most Viewed' },
];

export default function MediaFilterBar({
  activeFilter = 'ALL',
  onFilterChange,
  activeSort = 'FEATURED',
  onSortChange,
  counts = { ALL: 0, VIDEO: 0, PHOTO: 0, POSTER: 0 },
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
      {/* ── Filter Pills ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {FILTER_CONFIG.map((f) => {
          const isActive = activeFilter === f.key;
          const Icon = f.icon;
          const count = counts[f.key] || 0;

          return (
            <button
              key={f.key}
              onClick={() => onFilterChange && onFilterChange(f.key)}
              className={`
                shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black
                transition-all duration-200 cursor-pointer border select-none
                ${isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Icon size={13} className={isActive ? 'opacity-100' : 'opacity-70'} />
              <span>{f.label}</span>
              <span
                className={`
                  text-[10px] font-black px-1.5 py-0.5 rounded-full
                  ${isActive
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Sort Dropdown ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <FiSliders size={12} />
          Sort:
        </span>
        <select
          value={activeSort}
          onChange={(e) => onSortChange && onSortChange(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
