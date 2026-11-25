/**
 * IndustryContentSkeleton.jsx
 *
 * Polished skeleton placeholders matching the visual-first media layout.
 */

import React from 'react';

export function HeroBannerSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden min-h-[340px] bg-slate-200 dark:bg-slate-800 animate-pulse relative p-6 sm:p-8 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <div className="h-6 w-36 bg-slate-300 dark:bg-slate-700 rounded-full" />
        <div className="h-7 w-28 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="space-y-3 max-w-xl">
        <div className="h-8 sm:h-10 w-3/4 bg-slate-300 dark:bg-slate-700 rounded-2xl" />
        <div className="h-4 w-1/2 bg-slate-300 dark:bg-slate-700 rounded-lg" />
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-36 bg-slate-300 dark:bg-slate-700 rounded-2xl" />
          <div className="h-10 w-32 bg-slate-300 dark:bg-slate-700 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="aspect-video sm:aspect-[16/10] bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-3.5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
    </div>
  );
}

export default function IndustryShowcaseSkeleton() {
  return (
    <div className="space-y-6">
      <HeroBannerSkeleton />
      <FilterBarSkeleton />
      <MediaGridSkeleton count={6} />
    </div>
  );
}
