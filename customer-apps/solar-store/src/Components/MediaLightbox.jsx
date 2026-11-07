import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiDownload,
  FiShare2,
  FiCheck,
  FiPlay,
  FiImage,
  FiVideo,
  FiLayers,
  FiMaximize,
  FiInfo,
  FiPackage,
} from "react-icons/fi";

function isYouTube(url) {
  return typeof url === "string" && (url.includes("youtube.com") || url.includes("youtu.be"));
}

function getYouTubeEmbed(url) {
  if (!url) return "";
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : url;
}

function isVimeo(url) {
  return typeof url === "string" && url.includes("vimeo.com");
}

function getVimeoEmbed(url) {
  if (!url) return "";
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
}

export default function MediaLightbox({
  isOpen = false,
  items = [],
  currentIndex = 0,
  onClose,
  onIndexChange,
}) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const [copied, setCopied] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const currentItem = items[currentIndex] || null;

  // Reset slide index and zoom when switching item
  useEffect(() => {
    setActiveSlideIndex(0);
    setZoomLevel(1);
    setVideoError(false);
  }, [currentIndex]);

  // Reset zoom when switching slide inside same item
  useEffect(() => {
    setZoomLevel(1);
    setVideoError(false);
  }, [activeSlideIndex]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose && onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        // If current item has multiple slides and not on first slide, prev slide
        const mediaList = currentItem?.media || [];
        if (mediaList.length > 1 && activeSlideIndex > 0) {
          setActiveSlideIndex((s) => s - 1);
        } else if (currentIndex > 0) {
          onIndexChange && onIndexChange(currentIndex - 1);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const mediaList = currentItem?.media || [];
        if (mediaList.length > 1 && activeSlideIndex < mediaList.length - 1) {
          setActiveSlideIndex((s) => s + 1);
        } else if (currentIndex < items.length - 1) {
          onIndexChange && onIndexChange(currentIndex + 1);
        }
      }
    },
    [isOpen, currentIndex, activeSlideIndex, currentItem, items.length, onClose, onIndexChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !currentItem) return null;

  // Resolve slides and current media
  const allMedia = Array.isArray(currentItem.media) && currentItem.media.length > 0
    ? currentItem.media
    : [];

  // Determine current active media item
  const currentSlide = allMedia[activeSlideIndex] || allMedia[0] || null;

  // Determine if video
  const itemVideoUrl = currentItem.video_url || null;
  const slideUrl = currentSlide?.url || itemVideoUrl || null;
  const slidePoster = currentSlide?.poster_url || currentSlide?.thumbnail_url || currentItem.thumbnail || null;
  const isVideoMedia =
    currentSlide?.media_type === "VIDEO" ||
    currentItem.content_type === "VIDEO" ||
    currentItem.content_type === "EXPLAINER_VIDEO" ||
    currentItem.content_type === "VIDEO_SLIDER" ||
    Boolean(itemVideoUrl) ||
    Boolean(slideUrl && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(slideUrl)) ||
    Boolean(slideUrl && (isYouTube(slideUrl) || isVimeo(slideUrl)));

  const videoUrl = isVideoMedia ? (slideUrl || itemVideoUrl) : null;
  const imageUrl = !isVideoMedia ? (slideUrl || slidePoster || currentItem.thumbnail) : slidePoster;

  const isEmbedVideo = isVideoMedia && (isYouTube(videoUrl) || isVimeo(videoUrl));
  const embedUrl = isYouTube(videoUrl)
    ? getYouTubeEmbed(videoUrl)
    : isVimeo(videoUrl)
    ? getVimeoEmbed(videoUrl)
    : null;

  const displayHeading = currentItem.heading || currentItem.title || "Solar Media Asset";
  const displayDescription = currentItem.short_description || "";

  // Item navigation
  const hasPrevItem = currentIndex > 0;
  const hasNextItem = currentIndex < items.length - 1;
  const goToPrevItem = () => {
    if (hasPrevItem) onIndexChange && onIndexChange(currentIndex - 1);
  };
  const goToNextItem = () => {
    if (hasNextItem) onIndexChange && onIndexChange(currentIndex + 1);
  };

  // Slide navigation
  const hasPrevSlide = activeSlideIndex > 0;
  const hasNextSlide = activeSlideIndex < allMedia.length - 1;
  const goToPrevSlide = () => {
    if (hasPrevSlide) setActiveSlideIndex((s) => s - 1);
    else if (hasPrevItem) onIndexChange && onIndexChange(currentIndex - 1);
  };
  const goToNextSlide = () => {
    if (hasNextSlide) setActiveSlideIndex((s) => s + 1);
    else if (hasNextItem) onIndexChange && onIndexChange(currentIndex + 1);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.35, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.35, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  // Share
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download
  const handleDownload = () => {
    const urlToDownload = isVideoMedia && videoUrl ? videoUrl : imageUrl;
    if (!urlToDownload) return;
    const link = document.createElement("a");
    link.href = urlToDownload;
    link.target = "_blank";
    link.download = `${currentItem.title || "solar-media"}.${isVideoMedia ? "mp4" : "jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fullscreen container
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black/95 backdrop-blur-xl text-white select-none transition-all duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={displayHeading}
    >
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/95 via-black/80 to-transparent z-40 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-white/10 text-white border border-white/10">
              {currentIndex + 1} / {items.length}
            </span>
            {allMedia.length > 1 && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-blue-600/70 text-white border border-blue-400/30 flex items-center gap-1">
                <FiLayers size={12} />
                Slide {activeSlideIndex + 1}/{allMedia.length}
              </span>
            )}
          </div>

          <div className="min-w-0 hidden sm:block">
            <h2 className="text-sm font-bold truncate text-white leading-tight">
              {displayHeading}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-blue-300">
                {currentItem.content_type?.replace(/_/g, " ")}
              </span>
              {currentItem.industries?.[0]?.name && (
                <span className="text-[10px] font-bold text-slate-300 truncate">
                  • {currentItem.industries[0].name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom Controls for Images & Posters */}
          {!isVideoMedia && (
            <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1 border border-white/10">
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                title="Zoom In"
              >
                <FiZoomIn size={15} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                title="Zoom Out"
              >
                <FiZoomOut size={15} />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                title="Reset Zoom"
              >
                <FiRotateCcw size={13} />
              </button>
            </div>
          )}

          {/* Download */}
          {currentItem.allow_download !== false && (
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download File"
            >
              <FiDownload size={16} />
            </button>
          )}

          {/* Share */}
          {currentItem.allow_share !== false && (
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer relative"
              title="Share Link"
            >
              {copied ? <FiCheck size={16} className="text-emerald-400" /> : <FiShare2 size={16} />}
              {copied && (
                <span className="absolute -bottom-7 right-0 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded shadow">
                  Copied!
                </span>
              )}
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer hidden sm:flex"
            title="Toggle Fullscreen"
          >
            <FiMaximize size={16} />
          </button>

          {/* Info Drawer Toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showInfo ? "bg-blue-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Toggle Description"
          >
            <FiInfo size={16} />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/20 hover:bg-red-600 text-white transition-all cursor-pointer hover:scale-105 active:scale-95 ml-1"
            title="Close (Esc)"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* ── Main Canvas ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Arrow Left */}
        {(hasPrevItem || hasPrevSlide) && (
          <button
            onClick={goToPrevSlide}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110 shadow-2xl cursor-pointer"
            aria-label="Previous"
            title="Previous (Arrow Left)"
          >
            <FiChevronLeft size={26} />
          </button>
        )}

        {/* Navigation Arrow Right */}
        {(hasNextItem || hasNextSlide) && (
          <button
            onClick={goToNextSlide}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110 shadow-2xl cursor-pointer"
            aria-label="Next"
            title="Next (Arrow Right)"
          >
            <FiChevronRight size={26} />
          </button>
        )}

        {/* Media Container */}
        <div className="relative max-w-6xl max-h-[75vh] w-full h-full flex items-center justify-center">
          {isVideoMedia ? (
            isEmbedVideo ? (
              <div className="w-full h-full max-h-[72vh] aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
                <iframe
                  src={embedUrl}
                  title={displayHeading}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {videoError ? (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 max-w-md">
                    <FiVideo size={36} className="text-amber-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-white mb-2">Video playback issue</p>
                    <p className="text-xs text-slate-300 mb-4">
                      The video stream could not be loaded directly.
                    </p>
                    {videoUrl && (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                      >
                        <FiPlay size={13} /> Open Video in New Tab
                      </a>
                    )}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    poster={slidePoster || imageUrl}
                    autoPlay
                    controls
                    playsInline
                    onError={() => setVideoError(true)}
                    className="max-h-[72vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black border border-white/10"
                  />
                )}
              </div>
            )
          ) : (
            <div
              className="flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={imageUrl}
                alt={displayHeading}
                className="max-h-[74vh] max-w-full rounded-2xl shadow-2xl object-contain select-none border border-white/10"
              />
            </div>
          )}

          {/* Slide Indicator Dots (for items with multiple slides) */}
          {allMedia.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              {allMedia.map((_, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setActiveSlideIndex(sIdx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    sIdx === activeSlideIndex
                      ? "w-6 h-2 bg-blue-500"
                      : "w-2 h-2 bg-white/40 hover:bg-white/80"
                  }`}
                  aria-label={`Go to slide ${sIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Strip ──────────────────────────────────────────────────── */}
      <div className="bg-black/95 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 z-40 space-y-3">
        {/* Collapsible Info Drawer */}
        {showInfo && (
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {displayHeading}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-blue-300">
                  {currentItem.content_type?.replace(/_/g, " ")}
                </span>
                {currentItem.is_featured && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                    ★ Featured
                  </span>
                )}
              </div>
              {displayDescription && (
                <p className="text-xs text-slate-300 font-normal leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {displayDescription}
                </p>
              )}
            </div>

            {/* Industry Badges */}
            {currentItem.industries?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {currentItem.industries.map((ind) => (
                  <span
                    key={ind.id || ind._id}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/10"
                  >
                    {ind.name}
                  </span>
                ))}
              </div>
            )}

            {/* Explore Tender Kits CTA */}
            {(currentItem.content_category === "GOVT_TENDER" || currentItem.industries?.length > 0) && (
              <a
                href={`/shop?industry=${encodeURIComponent(currentItem.industries?.[0]?.name || "")}${
                  currentItem.related_kit_ids?.[0] ? `&kit=${currentItem.related_kit_ids[0]}` : ""
                }`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md transition-all shrink-0 ml-auto cursor-pointer"
              >
                <FiPackage size={13} />
                <span>Explore This Tender Kits</span>
                <FiChevronRight size={13} />
              </a>
            )}
          </div>
        )}

        {/* Multi-slide Thumbnails (If current item is a slider / has multiple photos) */}
        {allMedia.length > 1 && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider shrink-0 mr-1">
                Slides:
              </span>
              {allMedia.map((mediaItem, sIdx) => {
                const isSelected = sIdx === activeSlideIndex;
                const thumb = mediaItem.thumbnail_url || mediaItem.poster_url || mediaItem.url;
                const isMediaVideo = mediaItem.media_type === "VIDEO";
                return (
                  <button
                    key={mediaItem.id || mediaItem._id || sIdx}
                    onClick={() => setActiveSlideIndex(sIdx)}
                    className={`
                      relative shrink-0 w-16 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-900
                      ${isSelected ? "border-blue-500 scale-105 shadow-md shadow-blue-500/40 ring-1 ring-blue-400" : "border-white/20 opacity-60 hover:opacity-100"}
                    `}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/70">
                        {sIdx + 1}
                      </div>
                    )}
                    {isMediaVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <FiPlay size={10} className="text-white fill-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Catalog Items Filmstrip (Switch between cards in this category) */}
        {items.length > 1 && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider shrink-0 mr-1">
                Items:
              </span>
              {items.map((item, idx) => {
                const isSelected = idx === currentIndex;
                const thumbMedia = item.media?.find((m) => m.thumbnail_url || m.poster_url || m.url) || item.media?.[0];
                const thumbUrl = thumbMedia?.thumbnail_url || thumbMedia?.poster_url || thumbMedia?.url || item.thumbnail;
                const isVid = item.content_type === "VIDEO" || item.content_type === "EXPLAINER_VIDEO" || item.content_type === "VIDEO_SLIDER";

                return (
                  <button
                    key={item.id || item._id || idx}
                    onClick={() => onIndexChange && onIndexChange(idx)}
                    className={`
                      relative shrink-0 w-16 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-900
                      ${isSelected ? "border-blue-500 scale-105 shadow-md shadow-blue-500/40 ring-1 ring-blue-400" : "border-white/20 opacity-60 hover:opacity-100"}
                    `}
                    title={item.heading || item.title}
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/50">
                        {idx + 1}
                      </div>
                    )}
                    {isVid && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <FiPlay size={10} className="text-white fill-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
