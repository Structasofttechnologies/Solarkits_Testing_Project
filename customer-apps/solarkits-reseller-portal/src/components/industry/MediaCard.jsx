/**
 * MediaCard.jsx
 *
 * Visual-First Editorial Media Card.
 * - Media occupies 85–90% of card area
 * - Aspect ratios preserved:
 *   - Video: 16:9 with central play overlay & duration badge
 *   - Poster: Portrait 4:5 / 3:4 ratio
 *   - Photo: 16:9 / 4:3 high-definition view
 * - Minimalist 2-line title + micro metadata
 * - Desktop hover actions / Mobile tap actions
 * - Focal point preservation
 */

import React, { useState } from 'react';
import {
  FiPlay,
  FiMaximize2,
  FiDownload,
  FiShare2,
  FiClock,
  FiImage,
  FiFileText,
  FiLayers,
} from 'react-icons/fi';

function format_duration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MediaCard({
  item,
  onClick,
  onDownload,
  onShare,
  role = 'RESELLER',
}) {
  const [imgError, setImgError] = useState(false);

  if (!item) return null;

  const {
    title,
    heading,
    short_description,
    content_type,
    media = [],
    is_featured,
    focal_position = 'center',
    allow_download = true,
    allow_share = true,
    industries = [],
  } = item;

  // Resolve media types
  const videoMedia = media.find((m) => m.media_type === 'VIDEO');
  const posterMedia = media.find((m) => m.media_type === 'POSTER' || m.media_type === 'THUMBNAIL');
  const imageMedia = media.find((m) => m.media_type === 'IMAGE' || m.media_type === 'PHOTO');
  const primaryMedia = media.find((m) => m.is_primary) || videoMedia || posterMedia || imageMedia || media[0];

  const isVideo = Boolean(videoMedia || content_type === 'VIDEO' || content_type === 'EXPLAINER_VIDEO' || content_type === 'VIDEO_SLIDER');
  const isPoster = content_type === 'POSTER' || primaryMedia?.media_type === 'POSTER';
  const isGallery = content_type === 'GALLERY' || media.length > 1;

  // Resolve thumbnail/image source
  const imageSrc =
    primaryMedia?.thumbnail_url ||
    primaryMedia?.poster_url ||
    primaryMedia?.url ||
    imageMedia?.url ||
    posterMedia?.url ||
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=800&auto=format&fit=crop';

  const durationSec = videoMedia?.duration_sec || primaryMedia?.duration_sec || null;

  // Aspect ratio class: Posters get portrait, videos 16:9, photos 16:9
  const aspectClass = isPoster
    ? 'aspect-[3/4] sm:aspect-[4/5]'
    : isVideo
    ? 'aspect-video'
    : 'aspect-video sm:aspect-[16/10]';

  const displayTitle = heading || title || 'Solar Photovoltaic Solution';
  const industryTag = industries[0]?.name || null;

  return (
    <div
      onClick={() => onClick && onClick(item)}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick(item);
        }
      }}
      aria-label={displayTitle}
    >
      {/* ── Media Frame (85-90% surface) ──────────────────────────────────── */}
      <div className={`relative w-full ${aspectClass} overflow-hidden bg-slate-950`}>
        {!imgError ? (
          <img
            src={imageSrc}
            alt={displayTitle}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
            style={{ objectPosition: focal_position }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-4 text-center">
            <FiImage size={32} className="text-white/40 mb-2" />
            <span className="text-xs font-bold text-white/80 line-clamp-1">{displayTitle}</span>
          </div>
        )}

        {/* Cinematic bottom gradient on thumbnail */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* ── Top-Left Media Type Badge ───────────────────────────────────── */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/10 shadow-xs">
            {isVideo ? (
              <>
                <FiPlay size={10} className="text-blue-400 fill-blue-400" />
                <span>Video</span>
              </>
            ) : isPoster ? (
              <>
                <FiFileText size={10} className="text-amber-400" />
                <span>Poster</span>
              </>
            ) : isGallery ? (
              <>
                <FiLayers size={10} className="text-emerald-400" />
                <span>Album ({media.length})</span>
              </>
            ) : (
              <>
                <FiImage size={10} className="text-cyan-400" />
                <span>Photo</span>
              </>
            )}
          </span>

          {is_featured && (
            <span className="px-2 py-1 rounded-xl bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              ★ Featured
            </span>
          )}
        </div>

        {/* ── Video Play Center Overlay ────────────────────────────────────── */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-110 transition-transform duration-300">
              <div className="w-9 h-9 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-md">
                <FiPlay size={16} className="ml-0.5 text-blue-950 fill-blue-950" />
              </div>
            </div>
          </div>
        )}

        {/* ── Duration Badge ──────────────────────────────────────────────── */}
        {durationSec && (
          <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-black flex items-center gap-1 shadow-xs border border-white/10">
            <FiClock size={10} />
            <span>{format_duration(durationSec)}</span>
          </div>
        )}

        {/* ── Desktop Hover Quick Actions Toolbar ─────────────────────────── */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 p-4 z-20 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick && onClick(item);
            }}
            className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-black shadow-lg flex items-center gap-1.5 hover:bg-blue-50 transition-all cursor-pointer transform hover:scale-105"
            title="View Fullscreen"
          >
            <FiMaximize2 size={13} />
            <span>View 4K</span>
          </button>

          {allow_download && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload ? onDownload(item) : window.open(imageSrc, '_blank');
              }}
              className="p-2 rounded-xl bg-black/60 hover:bg-black text-white text-xs font-bold border border-white/30 transition-all cursor-pointer hover:scale-105"
              title="Download Asset"
            >
              <FiDownload size={14} />
            </button>
          )}

          {allow_share && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare ? onShare(item) : navigator.clipboard?.writeText(window.location.href);
              }}
              className="p-2 rounded-xl bg-black/60 hover:bg-black text-white text-xs font-bold border border-white/30 transition-all cursor-pointer hover:scale-105"
              title="Share Asset"
            >
              <FiShare2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Minimalist Content Footer ───────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 space-y-1">
        {industryTag && (
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
            {industryTag}
          </span>
        )}

        <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#185ADB] transition-colors">
          {displayTitle}
        </h3>

        {short_description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 leading-relaxed">
            {short_description}
          </p>
        )}
      </div>
    </div>
  );
}
