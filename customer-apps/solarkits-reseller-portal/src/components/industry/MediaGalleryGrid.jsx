/**
 * MediaGalleryGrid.jsx
 *
 * Editorial Responsive Media Grid.
 * - Desktop: 3-column grid (featured card can span 2 cols)
 * - Tablet: 2-column grid
 * - Mobile: 1-column full-width cards
 * - Renders MediaCard with smooth hover and click interactions
 */

import React from 'react';
import MediaCard from './MediaCard';
import { FiImage } from 'react-icons/fi';

export default function MediaGalleryGrid({
  items = [],
  onCardClick,
  onDownload,
  onShare,
  role = 'RESELLER',
  emptyMessage = 'No media assets available in this category.',
}) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
          <FiImage size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="font-heading font-black text-sm text-slate-900 dark:text-white">
            No Media Found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {items.map((item, index) => {
        // Optional feature: First card can span 2 columns if marked featured and on desktop
        const isFeaturedSpan = index === 0 && item.is_featured && items.length > 2;

        return (
          <div
            key={item.id || item._id || index}
            className={isFeaturedSpan ? 'sm:col-span-2' : ''}
          >
            <MediaCard
              item={item}
              onClick={onCardClick}
              onDownload={onDownload}
              onShare={onShare}
              role={role}
            />
          </div>
        );
      })}
    </div>
  );
}
