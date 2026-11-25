/**
 * FeaturedMediaHero.jsx
 *
 * Cinematic Featured Media Hero Banner.
 * - Desktop aspect ratio ~21:9 / 16:7, Mobile 4:5.
 * - Large visual media (Video / 4K Photo / Poster) with minimal text overlay.
 * - Central play button for videos with duration badge.
 * - Top-right Full-Screen 4K viewer trigger.
 * - Role-tailored primary CTA button.
 * - Muted autoplay with IntersectionObserver (stops when scrolled out of view).
 */

import React, { useRef, useEffect, useState } from 'react';
import { FiPlay, FiMaximize2, FiArrowRight, FiVolume2, FiVolumeX, FiClock } from 'react-icons/fi';

const DEFAULT_POSTERS = {
  residential: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=1800&auto=format&fit=crop',
  commercial: 'https://images.unsplash.com/photo-1545208942-e1c9c916524b?q=80&w=1800&auto=format&fit=crop',
  agriculture: 'https://images.unsplash.com/photo-1592833159155-c62df1b65634?q=80&w=1800&auto=format&fit=crop',
  utility: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=1800&auto=format&fit=crop',
};

function format_duration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FeaturedMediaHero({
  content,
  onCtaClick,
  onOpenFullscreen,
  role = 'RESELLER',
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  if (!content) return null;

  const {
    media = [],
    heading,
    short_description,
    cta_label,
    cta_url,
    reseller_cta_label,
    reseller_cta_url,
    distributor_cta_label,
    distributor_cta_url,
    content_type,
    autoplay,
    focal_position = 'center',
    video_url,
  } = content;

  // Resolve media items
  const videoMedia = media.find((m) => m.media_type === 'VIDEO');
  const imageMedia = media.find((m) => m.media_type === 'IMAGE' || m.media_type === 'PHOTO');
  const posterMedia = media.find((m) => m.media_type === 'POSTER' || m.media_type === 'THUMBNAIL');
  const primaryMedia = media.find((m) => m.is_primary) || videoMedia || imageMedia || posterMedia || media[0];

  // Resolve background and video URLs
  const activeVideoUrl = video_url || videoMedia?.url || null;
  const isVideoItem = Boolean(activeVideoUrl || content_type === 'VIDEO' || content_type === 'EXPLAINER_VIDEO' || content_type === 'VIDEO_SLIDER');
  
  const fallbackPoster = DEFAULT_POSTERS.commercial;
  const posterUrl = primaryMedia?.poster_url || primaryMedia?.thumbnail_url || imageMedia?.url || posterMedia?.url || fallbackPoster;

  // Duration
  const durationSec = videoMedia?.duration_sec || primaryMedia?.duration_sec || null;

  // CTA resolution per role
  const resolvedCtaLabel = role === 'DISTRIBUTOR'
    ? distributor_cta_label || cta_label || 'View BOS Kit →'
    : reseller_cta_label || cta_label || 'View Solar Kit →';

  const resolvedCtaUrl = role === 'DISTRIBUTOR'
    ? distributor_cta_url || cta_url || '/distributor/portal/procure'
    : reseller_cta_url || cta_url || '/catalog';

  // Badge text
  const badgeLabel = isVideoItem
    ? 'Official 4K Video Showcase'
    : content_type === 'POSTER'
    ? 'Product Spec Poster'
    : content_type === 'GALLERY'
    ? 'Project Photo Album'
    : 'Featured Industry Showcase';

  // Autoplay management with IntersectionObserver
  useEffect(() => {
    if (!videoRef.current || !autoplay || !isVideoItem) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.4 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoplay, isVideoItem]);

  const handleHeroClick = () => {
    if (onOpenFullscreen) {
      onOpenFullscreen(content);
    }
  };

  const handleCta = (e) => {
    e.stopPropagation();
    if (onCtaClick) onCtaClick(content);
    if (resolvedCtaUrl) {
      if (resolvedCtaUrl.startsWith('/')) window.location.href = resolvedCtaUrl;
      else window.open(resolvedCtaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-800/40 group cursor-pointer select-none transition-all duration-300"
      style={{ minHeight: '340px' }}
      onClick={handleHeroClick}
      role="region"
      aria-label={heading || 'Featured Solar Showcase'}
    >
      {/* ── Background Media Canvas ────────────────────────────────────────── */}
      <div className="absolute inset-0 w-full h-full bg-slate-950 overflow-hidden">
        {isVideoItem && activeVideoUrl && !videoError ? (
          <video
            ref={videoRef}
            src={activeVideoUrl}
            poster={posterUrl}
            muted={isMuted}
            loop
            playsInline
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            style={{ objectPosition: focal_position }}
            onError={() => setVideoError(true)}
          />
        ) : (
          <img
            src={posterUrl}
            alt={heading || 'Featured Industry Solar Showcase'}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            style={{ objectPosition: focal_position }}
          />
        )}

        {/* Cinematic Dual Gradient: subtle dark top + rich dark bottom for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      </div>

      {/* ── Top Bar Badges & Full-Screen Trigger ───────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between p-4 sm:p-6">
        {/* Content-Type Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 transition-all shadow-xs">
          <span className="text-amber-400">⚡</span>
          <span>{badgeLabel}</span>
        </div>

        {/* Full-Screen 4K Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenFullscreen) onOpenFullscreen(content);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/25 hover:border-white/50 transition-all hover:scale-105 shadow-md cursor-pointer"
          title="Open Fullscreen Viewer"
        >
          <FiMaximize2 size={13} />
          <span className="hidden sm:inline">Full Screen 4K</span>
        </button>
      </div>

      {/* ── Center Play Trigger for Videos ─────────────────────────────────── */}
      {isVideoItem && (
        <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300 pointer-events-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg">
              <FiPlay size={24} className="ml-1 text-blue-950" />
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Content Overlay ─────────────────────────────────────────── */}
      <div className="relative z-20 p-6 sm:p-8 sm:pb-8 flex flex-col justify-end mt-24 sm:mt-36 max-w-4xl space-y-2.5">
        {/* Short Headline (6-9 words) */}
        <h1 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight drop-shadow-md">
          {heading || content.title || 'Advanced Solar PV Systems & Component Technology'}
        </h1>

        {/* Short Caption (< 100 characters) */}
        {short_description && (
          <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-2 max-w-2xl drop-shadow-sm leading-relaxed">
            {short_description}
          </p>
        )}

        {/* CTAs & Duration Badge */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {isVideoItem && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenFullscreen) onOpenFullscreen(content);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#185ADB] hover:bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <FiPlay size={14} className="fill-white" />
              <span>Watch 4K Video</span>
            </button>
          )}

          {/* Primary Role CTA */}
          <button
            onClick={handleCta}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>{resolvedCtaLabel}</span>
            <FiArrowRight size={14} />
          </button>

          {/* Duration Badge */}
          {durationSec && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-md text-white/90 text-xs font-bold border border-white/15">
              <FiClock size={13} />
              <span>{format_duration(durationSec)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
